from flask import Flask, request
from flask_socketio import SocketIO, emit
import rtmidi
import sys
import json
import os
import xml.etree.ElementTree as ET

CONFIG_FILE = "presets.json"

# 🔥 STAŁA LOKALIZACJA PRESETÓW
DEFAULT_PRESET_DIR = "/Users/piotrgebala/Documents/Universal Audio/Sessions"

# IOType do ignorowania: SPDIF (2), Virtual 7/8 (12,13), system I/O
IGNORE_IOTYPES = {12, 13}


# ------------------------------------------------------
# 1. WYBÓR PLIKU PRESETU — teraz z pełnym error handlingiem
# ------------------------------------------------------

def choose_preset(directory: str):
    # sprawdź istnienie katalogu
    if not os.path.isdir(directory):
        print(f"❌ Błąd: katalog presetów nie istnieje:\n{directory}")
        return None

    # wczytaj pliki presetów
    files = [f for f in os.listdir(directory) if f.endswith((".xml", ".uadmix"))]

    if not files:
        print("❌ Brak presetów (.xml lub .uadmix) w katalogu.")
        return None

    print("\nDostępne presety:")
    for i, fname in enumerate(files):
        print(f"{i}: {fname}")

    # powtarzaj aż użytkownik poda poprawny numer
    while True:
        choice_raw = input("\nWybierz preset numerkiem: ")

        # ValueError handling
        if not choice_raw.isdigit():
            print("⚠️ Podaj numer (cyfrę). Spróbuj ponownie.")
            continue

        choice = int(choice_raw)

        # zakres
        if choice < 0 or choice >= len(files):
            print("⚠️ Niepoprawny numer. Wybierz numer z listy.")
            continue

        # OK — zwracamy ścieżkę
        return os.path.join(directory, files[choice])


# ------------------------------------------------------
# 2. PARSOWANIE KANAŁÓW Z PRESETU
# ------------------------------------------------------

def get_uad_mixer_channels(path):
    try:
        tree = ET.parse(path)
    except Exception as e:
        print(f"❌ Nie mogę wczytać pliku preset: {e}")
        return []

    root = tree.getroot()

    mixer = root.find(".//mixer_object[@type='kMixer']")
    if mixer is None:
        print("❌ Plik preset nie zawiera bloku miksera.")
        return []

    channels = []

    for obj in mixer.findall("mixer_object[@type='kInput']"):

        # nazwy mono/stereo
        name_tag = obj.find("property[@id='kPropName']")
        if name_tag is None:
            continue
        name = name_tag.text

        stereo_name_tag = obj.find("property[@id='kPropStereoName']")
        stereo_name = stereo_name_tag.text if stereo_name_tag is not None else None

        # kolejność
        try:
            index = int(obj.attrib.get("relative_index", -1))
        except ValueError:
            continue

        # IOType do filtrowania
        io_tag = obj.find("property[@id='kPropIOType']")
        if io_tag is None:
            continue
        try:
            iotype = int(io_tag.text)
        except ValueError:
            continue

        if iotype in IGNORE_IOTYPES:
            continue

        if name.startswith("VIRTUAL 7") or name.startswith("VIRTUAL 8"):
            continue

        # stereo flag
        stereo_tag = obj.find("property[@id='kPropStereo']")
        stereo = stereo_tag is not None and stereo_tag.text == "1"

        channels.append({
            "index": index,
            "name": name,
            "stereo": stereo,
            "stereo_name": stereo_name
        })

    channels.sort(key=lambda ch: ch["index"])
    return channels


# ------------------------------------------------------
# 3. GRUPOWANIE STEREO PAR
# ------------------------------------------------------

def group_stereo_pairs(channels):
    grouped = []
    skip = False

    for i in range(len(channels)):
        if skip:
            skip = False
            continue

        ch = channels[i]

        # stereo L + stereo R → jedna nazwa stereo
        if ch["stereo"] and i + 1 < len(channels) and channels[i + 1]["stereo"]:
            stereo_label = ch["stereo_name"] or f"{ch['name']} LR"
            grouped.append({
                "name": stereo_label,
                "stereo": True
            })
            skip = True
        else:
            grouped.append({
                "name": ch["name"],
                "stereo": False
            })

    return grouped


# ------------------------------------------------------
# 4. NADAWANIE CHID
# ------------------------------------------------------

def assign_chid(grouped_channels):
    chid = 0
    final = []

    for ch in grouped_channels:
        final.append({
            "chid": chid,
            "chnam": ch["name"],
            "stereo": ch["stereo"]
        })
        chid += 2 if ch["stereo"] else 1

    return final


# ------------------------------------------------------
# 5. LISTA SAMYCH NAZW (CHNAM)
# ------------------------------------------------------

def extract_chnam(channel_json):
    return [ch["chnam"] for ch in channel_json]

def extract_chid(channel_json):
    return [ch["chid"] for ch in channel_json]


# ------------------------------------------------------
# 6. GŁÓWNE WYWOŁANIE SKRYPTU
# ------------------------------------------------------


print(f"\n📁 Domyślny katalog presetów:\n{DEFAULT_PRESET_DIR}")

preset_path = choose_preset(DEFAULT_PRESET_DIR)
if preset_path is None:
    print("⛔ Zakończono z powodu błędu.")
    exit(1)

print(f"\nWczytuję preset: {preset_path}\n")

raw_channels = get_uad_mixer_channels(preset_path)
grouped = group_stereo_pairs(raw_channels)
final = assign_chid(grouped)
cleaned = [ch for ch in final if "S/PDIF" not in ch["chnam"].upper()]


# JSON pełny
# print("\n📄 JSON wynikowy (kanały z CHID):\n")
# print(json.dumps(final, indent=2, ensure_ascii=False))

# lista chnam
chnam_list = extract_chnam(cleaned)
chid_list = extract_chid(cleaned)

print(chid_list)
print(chnam_list)


# -------------------------------------------------------
#   MIDI SETUP
# -------------------------------------------------------
midi_out = rtmidi.MidiOut()
ports = midi_out.get_ports()
iac_port = None
target_port_name = "IAC"

found_port = False
for i, name in enumerate(ports):
    if target_port_name in name:
        iac_port = i
        found_port = True
        break

if not found_port and ports:
    iac_port = 0
elif not ports:
    print("❌ Nie znaleziono żadnych portów MIDI output!")

if iac_port is not None:
    midi_out.open_port(iac_port)
    print(f"✔ MIDI Port Open: {ports[iac_port]}")


# -------------------------------------------------------
#   STATE MANAGEMENT
# -------------------------------------------------------

def create_mix(channel_names):
    return [{"name": name, "faderValue": 0, "panValue": 50, "isMuted": False, "isHidden": False} for name in channel_names]


# Default initial state (can be overwritten by presets)
default_names = chnam_list
current_state = [
    create_mix(default_names),  # MIX A
    create_mix(default_names),  # MIX B
    create_mix(default_names),  # MIX C
    create_mix(default_names),  # MIX D
]

FADER_BASE = 20
PAN_BASE = 80
MUTE_BASE = 60
MIDI_CHANNEL_MAP = {"0": 0, "1": 1, "2": 2, "3": 3}


# -------------------------------------------------------
#   PRESETS FILE IO
# -------------------------------------------------------

def load_presets_file():
    if not os.path.exists(CONFIG_FILE):
        return {}
    try:
        with open(CONFIG_FILE, "r") as f:
            return json.load(f)
    except:
        return {}


def save_presets_file(presets):
    with open(CONFIG_FILE, "w") as f:
        json.dump(presets, f, indent=4)


# -------------------------------------------------------
#   FLASK & SOCKET.IO
# -------------------------------------------------------

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")


@socketio.on("connect")
def handle_connect():
    print("Client connected")
    # Send current state
    emit("sync_state", current_state)
    # Send list of available presets
    presets = load_presets_file()
    emit("presets_list", list(presets.keys()))


@socketio.on("update_channel")
def handle_update(data):
    mix_idx = data.get("mixIndex")
    ch_idx = data.get("channelIndex")
    update = data.get("update")

    if mix_idx is not None and ch_idx is not None and update:
        try:
            # Update server state
            current_state[mix_idx][ch_idx].update(update)

            # Broadcast to others
            emit("state_updated", data, broadcast=True, include_self=False)

            # MIDI Logic
            if iac_port is not None:
                mix_str = str(mix_idx)
                midi_ch = MIDI_CHANNEL_MAP.get(mix_str, 0)

                if "faderValue" in update:
                    val = int(update["faderValue"])
                    midi_val = int((val / 100) * 127)
                    # if ch_idx < 11:
                    midi_out.send_message([0xB0 | midi_ch, FADER_BASE + chid_list[ch_idx], midi_val])
                    # else:
                    #     midi_out.send_message([0xB0 | midi_ch, FADER_BASE + chid_list[ch_idx]+2, midi_val])
                    print(midi_ch, FADER_BASE + chid_list[ch_idx], midi_val)

                if "panValue" in update:
                    val = int(update["panValue"])
                    midi_val = int((val / 100) * 127)
                    midi_out.send_message([0xB0 | midi_ch, PAN_BASE + ch_idx, midi_val])

                if "isMuted" in update:
                    state = update["isMuted"]
                    note = MUTE_BASE + ch_idx
                    status = (0x90 if state else 0x80) | midi_ch
                    velocity = 127 if state else 0
                    midi_out.send_message([status, note, velocity])
        except IndexError:
            print("Error: Channel index out of range")


# --- NEW: SETUP & PRESETS ---

@socketio.on("init_setup")
def init_setup(data):
    # data = { "count": 12, "prefix": "CH" } or custom list of names
    global current_state
    count = int(data.get("count", 8))
    names = [f"CH {i + 1}" for i in range(count)]

    # Reset state with new channel count
    current_state = [
        create_mix(names),
        create_mix(names),
        create_mix(names),
        create_mix(names),
    ]

    print(f"✔ Re-initialized mixer with {count} channels")
    emit("sync_state", current_state, broadcast=True)


@socketio.on("save_preset")
def save_preset(preset_name):
    if not preset_name: return
    presets = load_presets_file()
    presets[preset_name] = current_state
    save_presets_file(presets)
    print(f"✔ Preset saved: {preset_name}")
    emit("presets_list", list(presets.keys()), broadcast=True)


@socketio.on("load_preset")
def load_preset(preset_name):
    global current_state
    presets = load_presets_file()
    if preset_name in presets:
        current_state = presets[preset_name]
        print(f"✔ Loaded preset: {preset_name}")
        emit("sync_state", current_state, broadcast=True)


@socketio.on("delete_preset")
def delete_preset(preset_name):
    presets = load_presets_file()
    if preset_name in presets:
        del presets[preset_name]
        save_presets_file(presets)
        emit("presets_list", list(presets.keys()), broadcast=True)


if __name__ == "__main__":
    print("🚀 Server (Dynamic) running on 5050...")
    socketio.run(app, host="0.0.0.0", port=5050, allow_unsafe_werkzeug=True)