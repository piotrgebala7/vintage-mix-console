from flask import Flask, request
from flask_socketio import SocketIO, emit
import rtmidi
import sys
import json
import os

CONFIG_FILE = "presets.json"

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
    return [{"name": name, "faderValue": 70, "panValue": 50, "isMuted": False, "isHidden": False} for name in channel_names]


# Default initial state (can be overwritten by presets)
default_names = ["CH 1", "CH 2", "CH 3", "CH 4", "CH 5", "CH 6", "CH 7", "CH 8"]
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
                    midi_out.send_message([0xB0 | midi_ch, FADER_BASE + ch_idx, midi_val])

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