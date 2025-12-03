from flask import Flask, request
from flask_socketio import SocketIO, emit
import rtmidi
import sys
import json
import os

CONFIG_FILE = "config.json"

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
    print(f"⚠️ Nie znaleziono portu '{target_port_name}'. Używam pierwszego dostępnego: {ports[0]}")
    iac_port = 0
elif not ports:
    print("❌ Nie znaleziono żadnych portów MIDI output!")
else:
    print(f"✔ Znaleziono port MIDI: {ports[iac_port]}")

if iac_port is not None:
    midi_out.open_port(iac_port)

# -------------------------------------------------------
#   CONSTANTS
# -------------------------------------------------------

FADER_BASE = 20
PAN_BASE = 80
MUTE_BASE = 60

MIDI_CHANNEL_MAP = {
    "0": 0,
    "1": 1,
    "2": 2,
    "3": 3,
    "MAIN": 0
}


# -------------------------------------------------------
#   PRESETS MANAGEMENT
# -------------------------------------------------------

def load_config():
    if not os.path.exists(CONFIG_FILE):
        return {"presets": {}}
    try:
        with open(CONFIG_FILE, "r") as f:
            return json.load(f)
    except:
        return {"presets": {}}


def save_config(config):
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=4)


# -------------------------------------------------------
#   FLASK & SOCKET.IO
# -------------------------------------------------------

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")


@socketio.on("connect")
def handle_connect():
    print("Client connected")
    # Send list of available presets on connect
    config = load_config()
    emit("presets_list", list(config.get("presets", {}).keys()))


@socketio.on("get_presets")
def get_presets():
    config = load_config()
    emit("presets_list", list(config.get("presets", {}).keys()))


@socketio.on("save_preset")
def save_preset(data):
    # data = { name: "My Preset", state: [...] }
    name = data.get("name")
    state = data.get("state")

    if name and state:
        config = load_config()
        if "presets" not in config:
            config["presets"] = {}

        config["presets"][name] = state
        save_config(config)
        print(f"✔ Preset saved: {name}")
        emit("presets_list", list(config["presets"].keys()), broadcast=True)


@socketio.on("load_preset")
def load_preset(name):
    config = load_config()
    presets = config.get("presets", {})
    if name in presets:
        print(f"✔ Loading preset: {name}")
        emit("preset_data", presets[name])


@socketio.on("delete_preset")
def delete_preset(name):
    config = load_config()
    if name in config.get("presets", {}):
        del config["presets"][name]
        save_config(config)
        print(f"✔ Preset deleted: {name}")
        emit("presets_list", list(config["presets"].keys()), broadcast=True)


# MIDI Events (unchanged)
@socketio.on("midi_cc")
def midi_cc(data):
    if iac_port is None: return
    ch = data.get("ch", 1) - 1
    mix = str(data.get("mix", "0"))
    value = int(data.get("value", 0))
    midi_ch = MIDI_CHANNEL_MAP.get(mix, 0)
    cc_num = FADER_BASE + ch
    value = max(0, min(127, value))
    status = 0xB0 | midi_ch
    midi_out.send_message([status, cc_num, value])
    print(f"CC: Mix {mix} -> Ch {midi_ch + 1}, Track {ch + 1}, Val {value}")


@socketio.on("midi_pan")
def midi_pan(data):
    if iac_port is None: return
    ch = data.get("ch", 1) - 1
    mix = str(data.get("mix", "0"))
    value = int(data.get("value", 64))
    midi_ch = MIDI_CHANNEL_MAP.get(mix, 0)
    cc_num = PAN_BASE + ch
    value = max(0, min(127, value))
    status = 0xB0 | midi_ch
    midi_out.send_message([status, cc_num, value])
    print(f"PAN: Mix {mix} -> Ch {midi_ch + 1}, Track {ch + 1}, Val {value}")


@socketio.on("midi_mute")
def midi_mute(data):
    if iac_port is None: return
    ch = data.get("ch", 1) - 1
    mix = str(data.get("mix", "0"))
    state = data.get("state", False)
    midi_ch = MIDI_CHANNEL_MAP.get(mix, 0)
    note = MUTE_BASE + ch
    status = (0x90 if state else 0x80) | midi_ch
    velocity = 127 if state else 0
    midi_out.send_message([status, note, velocity])
    print(f"MUTE: Mix {mix} -> Ch {midi_ch + 1}, Track {ch + 1}, {'ON' if state else 'OFF'}")


if __name__ == "__main__":
    print("🚀 Starting Python MIDI Bridge on port 5050...")
    socketio.run(app, host="0.0.0.0", port=5050, allow_unsafe_werkzeug=True)