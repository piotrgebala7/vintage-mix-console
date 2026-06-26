#!/usr/bin/env python3
"""
UAD Console MIDI Controller
Odbiera MIDI z fizycznego kontrolera i steruje parametrami UAD Console przez IAC Driver.

Mapowanie (midi_mapping.json) określa:
  - który CC/Note z kontrolera → który kanał / mix / parametr UAD Console

Protokół MIDI do UAD Console (musi zgadzać się z uaconfig.json):
  Fader:  CC  na kanale MIDI  (MIDI ch = mix index 0-3, CC# = 20 + chid)
  Pan:    CC  na kanale MIDI  (MIDI ch = mix index 0-3, CC# = 80 + chid)
  Mute:   Note On/Off         (MIDI ch = mix index 0-3, Note# = 60 + chid)
"""

import rtmidi
import json
import os
import sys
import time
import xml.etree.ElementTree as ET

# ── Stałe (muszą zgadzać się z mapowaniem w UAD Console → MIDI Learn) ─────────
IAC_PORT_NAME   = "IAC"
PRESET_DIR      = "/Users/piotrgebala/Documents/Universal Audio/Sessions"
MAPPING_FILE    = "midi_mapping.json"

FADER_CC_BASE   = 20   # CC# = FADER_CC_BASE + chid
PAN_CC_BASE     = 80   # CC# = PAN_CC_BASE   + chid
MUTE_NOTE_BASE  = 60   # Note# = MUTE_NOTE_BASE + chid
MIX_TO_MIDI_CH  = {0: 0, 1: 1, 2: 2, 3: 3}   # Mix A/B/C/D → MIDI ch 0/1/2/3
MIX_LABELS      = ["A", "B", "C", "D"]

IGNORE_IOTYPES  = {12, 13}


# ── Parsowanie presetu UAD ─────────────────────────────────────────────────────

def choose_preset(directory: str) -> str | None:
    if not os.path.isdir(directory):
        print(f"Błąd: katalog nie istnieje: {directory}")
        return None
    files = sorted(f for f in os.listdir(directory) if f.endswith((".xml", ".uadmix")))
    if not files:
        print("Brak plików presetu (.xml / .uadmix).")
        return None
    print("\nDostępne presety:")
    for i, name in enumerate(files):
        print(f"  {i}: {name}")
    while True:
        raw = input("\nWybierz preset (numer): ").strip()
        if raw.isdigit() and 0 <= int(raw) < len(files):
            return os.path.join(directory, files[int(raw)])
        print("Nieprawidłowy numer, spróbuj ponownie.")


def _parse_raw_channels(path: str) -> list[dict]:
    tree = ET.parse(path)
    root = tree.getroot()
    mixer = root.find(".//mixer_object[@type='kMixer']")
    if mixer is None:
        raise ValueError("Plik nie zawiera bloku kMixer.")
    channels = []
    for obj in mixer.findall("mixer_object[@type='kInput']"):
        name_tag   = obj.find("property[@id='kPropName']")
        io_tag     = obj.find("property[@id='kPropIOType']")
        stereo_tag = obj.find("property[@id='kPropStereo']")
        sname_tag  = obj.find("property[@id='kPropStereoName']")
        if name_tag is None or io_tag is None:
            continue
        try:
            iotype = int(io_tag.text)
            index  = int(obj.attrib.get("relative_index", -1))
        except ValueError:
            continue
        if iotype in IGNORE_IOTYPES:
            continue
        name = name_tag.text or ""
        if name.startswith(("VIRTUAL 7", "VIRTUAL 8")):
            continue
        stereo = stereo_tag is not None and stereo_tag.text == "1"
        channels.append({
            "index":       index,
            "name":        name,
            "stereo":      stereo,
            "stereo_name": sname_tag.text if sname_tag is not None else None,
        })
    channels.sort(key=lambda c: c["index"])
    return channels


def build_channel_list(path: str) -> list[dict]:
    """Zwraca listę kanałów z przypisanymi chid."""
    raw = _parse_raw_channels(path)
    grouped = []
    skip = False
    for i, ch in enumerate(raw):
        if skip:
            skip = False
            continue
        if ch["stereo"] and i + 1 < len(raw) and raw[i + 1]["stereo"]:
            grouped.append({"name": ch["stereo_name"] or f"{ch['name']} LR", "stereo": True})
            skip = True
        else:
            grouped.append({"name": ch["name"], "stereo": False})

    result, chid = [], 0
    for g in grouped:
        if "S/PDIF" not in g["name"].upper():
            result.append({"chid": chid, "name": g["name"], "stereo": g["stereo"]})
        chid += 2 if g["stereo"] else 1
    return result


# ── Konwersja wartości ─────────────────────────────────────────────────────────

def midi_to_db(v: int) -> float:
    """MIDI 0-127 → dB (-144 do +12), zgodnie z mapowaniem server_v1.py."""
    return (v / 127) * 156 - 144

def db_to_midi(db: float) -> int:
    return max(0, min(127, round(((db + 144) / 156) * 127)))

def midi_to_pct(v: int) -> float:
    return (v / 127) * 100

def pct_to_midi(pct: float) -> int:
    return max(0, min(127, round((pct / 100) * 127)))


# ── Mapowanie kontrolera ───────────────────────────────────────────────────────

def generate_default_mapping(channels: list[dict]) -> dict:
    """
    Domyślne mapowanie (passthrough): CC z kontrolera na MIDI ch 0-3
    trafia bezpośrednio do UAD Console z tym samym CC# i kanałem.
    Każdy kanał UAD (chid) odpowiada CC# = 20+chid (fader), 80+chid (pan),
    Note# = 60+chid (mute), na odpowiednim kanale MIDI mixa.
    """
    mapping = {}
    for ch in channels:
        chid = ch["chid"]
        for mix_idx in range(4):
            midi_ch = MIX_TO_MIDI_CH[mix_idx]
            # Fader CC
            key = f"CC,{midi_ch},{FADER_CC_BASE + chid}"
            mapping[key] = {"chid": chid, "mix": mix_idx, "param": "fader"}
            # Pan CC
            key = f"CC,{midi_ch},{PAN_CC_BASE + chid}"
            mapping[key] = {"chid": chid, "mix": mix_idx, "param": "pan"}
            # Mute Note
            key = f"NOTE,{midi_ch},{MUTE_NOTE_BASE + chid}"
            mapping[key] = {"chid": chid, "mix": mix_idx, "param": "mute"}
    return mapping


def load_mapping(channels: list[dict]) -> dict:
    if os.path.exists(MAPPING_FILE):
        with open(MAPPING_FILE) as f:
            data = json.load(f)
        mapping = data.get("mapping", data)  # obsługa starszego formatu
        print(f"Wczytano mapowanie z {MAPPING_FILE} ({len(mapping)} reguł).")
        return mapping
    else:
        mapping = generate_default_mapping(channels)
        save_mapping(mapping)
        print(f"Utworzono domyślne mapowanie → {MAPPING_FILE}")
        return mapping


def save_mapping(mapping: dict):
    with open(MAPPING_FILE, "w") as f:
        json.dump({"mapping": mapping}, f, indent=2, ensure_ascii=False)


# ── Główna klasa kontrolera ────────────────────────────────────────────────────

class UadMidiController:
    def __init__(self, channels: list[dict], mapping: dict):
        self.channels  = {ch["chid"]: ch["name"] for ch in channels}
        self.mapping   = mapping
        self.midi_out  = None
        self.midi_in   = None
        # Stan mute (toggle): klucz = (chid, mix_idx)
        self.mute_state: dict[tuple, bool] = {}

    # ── Porty MIDI ──────────────────────────────────────────────────────────────

    def open_output(self, port_name: str = IAC_PORT_NAME) -> bool:
        out = rtmidi.MidiOut()
        ports = out.get_ports()
        idx = next((i for i, n in enumerate(ports) if port_name in n), None)
        if idx is None:
            if ports:
                print(f"OSTRZEŻENIE: port '{port_name}' nie znaleziony, używam: {ports[0]}")
                idx = 0
            else:
                print("Błąd: brak portów MIDI wyjściowych!")
                return False
        out.open_port(idx)
        self.midi_out = out
        print(f"MIDI OUT → {ports[idx]}")
        return True

    def open_input(self, port_name: str | None = None) -> bool:
        midi_in = rtmidi.MidiIn()
        ports = midi_in.get_ports()
        if not ports:
            print("Błąd: brak portów MIDI wejściowych!")
            return False
        print("\nDostępne porty MIDI wejściowe:")
        for i, n in enumerate(ports):
            print(f"  {i}: {n}")

        if port_name:
            idx = next((i for i, n in enumerate(ports) if port_name in n), None)
            if idx is None:
                print(f"Port '{port_name}' nie znaleziony.")
                return False
        else:
            while True:
                raw = input("\nWybierz port wejściowy (numer): ").strip()
                if raw.isdigit() and 0 <= int(raw) < len(ports):
                    idx = int(raw)
                    break
                print("Nieprawidłowy numer.")

        midi_in.open_port(idx)
        self.midi_in = midi_in
        print(f"MIDI IN  ← {ports[idx]}")
        return True

    # ── Wysyłanie do UAD Console ─────────────────────────────────────────────

    def _send_fader(self, chid: int, mix_idx: int, midi_val: int):
        ch   = MIX_TO_MIDI_CH[mix_idx]
        cc   = FADER_CC_BASE + chid
        self.midi_out.send_message([0xB0 | ch, cc, midi_val])
        db = round(midi_to_db(midi_val), 1)
        print(f"  FADER  Mix{MIX_LABELS[mix_idx]} | {self.channels.get(chid, f'chid={chid}'):20s} | {db:+6.1f} dB  (CC{cc} ch{ch} val={midi_val})")

    def _send_pan(self, chid: int, mix_idx: int, midi_val: int):
        ch  = MIX_TO_MIDI_CH[mix_idx]
        cc  = PAN_CC_BASE + chid
        self.midi_out.send_message([0xB0 | ch, cc, midi_val])
        pct = round(midi_to_pct(midi_val), 1)
        print(f"  PAN    Mix{MIX_LABELS[mix_idx]} | {self.channels.get(chid, f'chid={chid}'):20s} | {pct:5.1f}%  (CC{cc} ch{ch} val={midi_val})")

    def _send_mute(self, chid: int, mix_idx: int, mute_on: bool):
        ch     = MIX_TO_MIDI_CH[mix_idx]
        note   = MUTE_NOTE_BASE + chid
        status = (0x90 if mute_on else 0x80) | ch
        vel    = 127 if mute_on else 0
        self.midi_out.send_message([status, note, vel])
        state = "WYCISZ" if mute_on else "ODCISZ"
        print(f"  MUTE   Mix{MIX_LABELS[mix_idx]} | {self.channels.get(chid, f'chid={chid}'):20s} | {state}  (Note{note} ch{ch})")

    # ── Obsługa wiadomości MIDI ─────────────────────────────────────────────

    def _on_midi(self, event, _data=None):
        msg, _ts = event
        if len(msg) < 3:
            return

        status   = msg[0]
        data1    = msg[1]
        data2    = msg[2]
        msg_type = status & 0xF0
        midi_ch  = status & 0x0F

        if msg_type == 0xB0:                    # CC
            key = f"CC,{midi_ch},{data1}"
            target = self.mapping.get(key)
            if target is None:
                return
            param   = target["param"]
            chid    = target["chid"]
            mix_idx = target["mix"]
            if param == "fader":
                self._send_fader(chid, mix_idx, data2)
            elif param == "pan":
                self._send_pan(chid, mix_idx, data2)

        elif msg_type in (0x90, 0x80):          # Note On / Off
            is_on = (msg_type == 0x90) and (data2 > 0)
            key   = f"NOTE,{midi_ch},{data1}"
            target = self.mapping.get(key)
            if target is None or target["param"] != "mute":
                return
            chid    = target["chid"]
            mix_idx = target["mix"]
            state_key = (chid, mix_idx)
            if is_on:
                # Toggle mute przy każdym Note On
                new_state = not self.mute_state.get(state_key, False)
                self.mute_state[state_key] = new_state
                self._send_mute(chid, mix_idx, new_state)

    # ── Główna pętla ────────────────────────────────────────────────────────

    def run(self):
        if self.midi_in is None or self.midi_out is None:
            print("Błąd: porty MIDI nie są otwarte.")
            return

        self.midi_in.set_callback(self._on_midi)
        print("\n✓ Kontroler aktywny — Ctrl+C aby zakończyć\n")
        try:
            while True:
                time.sleep(0.05)
        except KeyboardInterrupt:
            print("\nZakończono.")
        finally:
            self.midi_in.close_port()
            self.midi_out.close_port()


# ── Tryb interaktywny: dodawanie mapowania ────────────────────────────────────

def interactive_add_mapping(channels: list[dict], mapping: dict):
    """Prosty wizard do dodania/edycji wpisu w mapowaniu."""
    print("\n── Dodaj mapowanie ──────────────────────────────")
    print("Wciśnij klawisz/pokręć gałkę na kontrolerze, potem wpisz:")
    msg_type = input("Typ komunikatu [CC/NOTE]: ").strip().upper()
    if msg_type not in ("CC", "NOTE"):
        print("Nieznany typ.")
        return

    try:
        midi_ch = int(input("Kanał MIDI wejściowy (0-15): ").strip())
        data1   = int(input("CC# lub Note#: ").strip())
    except ValueError:
        print("Nieprawidłowa wartość.")
        return

    print("\nDostępne kanały UAD:")
    for ch in channels:
        print(f"  chid={ch['chid']:2d}  {ch['name']}")
    try:
        chid = int(input("Podaj chid: ").strip())
    except ValueError:
        print("Nieprawidłowe chid.")
        return

    print("Mix: 0=A, 1=B, 2=C, 3=D")
    try:
        mix_idx = int(input("Mix index (0-3): ").strip())
    except ValueError:
        print("Nieprawidłowy mix.")
        return

    param_options = ["fader", "pan", "mute"] if msg_type == "CC" else ["mute"]
    print(f"Parametr: {', '.join(f'{i}={p}' for i, p in enumerate(param_options))}")
    try:
        param = param_options[int(input("Numer parametru: ").strip())]
    except (ValueError, IndexError):
        print("Nieprawidłowy parametr.")
        return

    key = f"{msg_type},{midi_ch},{data1}"
    mapping[key] = {"chid": chid, "mix": mix_idx, "param": param}
    save_mapping(mapping)
    print(f"Dodano: {key} → chid={chid} Mix{MIX_LABELS[mix_idx]} {param}")


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    print("═══ UAD Console MIDI Controller ═══\n")

    # 1. Preset
    preset_path = choose_preset(PRESET_DIR)
    if not preset_path:
        sys.exit(1)
    print(f"\nWczytuję: {os.path.basename(preset_path)}")
    channels = build_channel_list(preset_path)
    print(f"Kanały ({len(channels)}):")
    for ch in channels:
        label = "stereo" if ch.get("stereo") else "mono"
        print(f"  chid={ch['chid']:2d}  [{label}]  {ch['name']}")

    # 2. Mapowanie
    mapping = load_mapping(channels)

    # 3. Opcjonalnie edycja mapowania
    while True:
        ans = input("\n[m] mapuj nowy CC/Note  [s] start  ? ").strip().lower()
        if ans == "m":
            interactive_add_mapping(channels, mapping)
        elif ans in ("s", ""):
            break

    # 4. Porty MIDI
    controller = UadMidiController(channels, mapping)
    if not controller.open_output(IAC_PORT_NAME):
        sys.exit(1)

    in_port_arg = sys.argv[1] if len(sys.argv) > 1 else None
    if not controller.open_input(in_port_arg):
        sys.exit(1)

    # 5. Pętla główna
    controller.run()


if __name__ == "__main__":
    main()
