from flask import Flask
from flask_socketio import SocketIO, emit
import socket
import subprocess
import threading
import time
import json
import math
import os
import atexit

CONFIG_FILE = "presets.json"


def _tapered_to_db(t: float) -> float:
    """GainTapered (0-1) → dB. Odwrotność fader taper z Fader.tsx."""
    if t >= 0.89: return  6 + (t - 0.89) * (6  / 0.11)
    if t >= 0.78: return  0 + (t - 0.78) * (6  / 0.11)
    if t >= 0.69: return -6 + (t - 0.69) * (6  / 0.09)
    if t >= 0.61: return -12 + (t - 0.61) * (6  / 0.08)
    if t >= 0.51: return -20 + (t - 0.51) * (8  / 0.10)
    if t >= 0.38: return -32 + (t - 0.38) * (12 / 0.13)
    if t >= 0.18: return -56 + (t - 0.18) * (24 / 0.20)
    u = t / 0.18
    return -56 - (1 - u) ** 2 * 88


def _db_to_tapered(db: float) -> float:
    """dB → GainTapered (0-1). Odwrotność _tapered_to_db."""
    if db >= 6:   return 0.89 + ((db - 6)   / 6)  * 0.11
    if db >= 0:   return 0.78 + ((db - 0)   / 6)  * 0.11
    if db >= -6:  return 0.69 + ((db + 6)   / 6)  * 0.09
    if db >= -12: return 0.61 + ((db + 12)  / 6)  * 0.08
    if db >= -20: return 0.51 + ((db + 20)  / 8)  * 0.10
    if db >= -32: return 0.38 + ((db + 32)  / 12) * 0.13
    if db >= -56: return 0.18 + ((db + 56)  / 24) * 0.20
    u = (db + 56) / -88
    return 0.18 * (1 - math.sqrt(max(0.0, u)))
UAD_HOST    = "127.0.0.1"
UAD_PORT    = 4710
SEND_BASE   = 2   # sends/2=CUE1(MixA), /3=CUE2(MixB), /4=CUE3(MixC), /5=CUE4(MixD)

SKIP_NAMES = ("S/PDIF", "TALKBACK", "N/A")

PROP_MAP = {
    "GainTapered/value": "faderValue",
    "Pan/value":         "panValue",
    "Bypass/value":      "isMuted",
}

# Główny fader kanału (Monitor MIX) używa FaderLevelTapered zamiast GainTapered
MAIN_PROP_MAP = {
    "FaderLevelTapered/value": "faderValue",
    "Pan/value":               "panValue",
    "Mute/value":              "isMuted",
}


# -------------------------------------------------------
#   UAD CONSOLE TCP
# -------------------------------------------------------

class UADConsole:
    def __init__(self):
        self.sock        = None
        self._lock       = threading.Lock()
        self._connected  = False
        self._reconnecting = False
        self._send_to_ch:  dict[str, tuple[int, int, str]] = {}
        self._name_to_ch:  dict[str, int] = {}
        self._meter_to_ch: dict[str, tuple[int, int]] = {}  # meter path → (ch_idx, mix_idx)
        self._known_input_keys: set[str]  = set()
        self._meter_levels: dict[tuple[int, int], float] = {}
        self._meter_lock  = threading.Lock()
        self._meter_dirty = False
        self.on_external_change = None
        self.on_config_changed  = None
        self.on_meters_update   = None               # callback(dict[(ch,mix)->dBFS])

        # odkryte kanały (wypełniane przez _discover_channels)
        self.chnam_list:  list[str]  = []
        self.chid_list:   list[int]  = []
        self.stereo_list: list[bool] = []

        # diagnostyka: ścieżki do logowania w _handle_message
        self._diag_paths: set[str] = set()

    # ── Połączenie ────────────────────────────────────────────────────────

    def connect(self) -> list | None:
        try:
            self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.sock.connect((UAD_HOST, UAD_PORT))
            self._connected = True
            print(f"✔ Połączono z UAD Console na {UAD_HOST}:{UAD_PORT}")

            self._discover_channels()
            initial_state = self._fetch_initial_state()

            threading.Thread(target=self._keepalive,        daemon=True).start()
            threading.Thread(target=self._recv_loop,         daemon=True).start()
            threading.Thread(target=self._meter_flush_loop,  daemon=True).start()
            self._subscribe_all()

            return initial_state
        except ConnectionRefusedError:
            print(f"❌ Nie można połączyć z UAD Console ({UAD_HOST}:{UAD_PORT})")
            print("   Upewnij się, że UAD Console jest uruchomiony.")
            return None

    # ── Odkrywanie kanałów przez TCP ─────────────────────────────────────

    def _recv_blocking(self, expected: int, timeout: float = 3.0) -> list[dict]:
        """Czyta z socketu do zebrania `expected` wiadomości (przed startem recv_loop)."""
        buf   = b""
        msgs  = []
        self.sock.settimeout(timeout)
        while len(msgs) < expected:
            try:
                chunk = self.sock.recv(8192)
                if not chunk:
                    break
                buf += chunk
                while b"\x00" in buf:
                    raw, buf = buf.split(b"\x00", 1)
                    if raw:
                        try:
                            msgs.append(json.loads(raw.decode()))
                        except Exception:
                            pass
            except socket.timeout:
                break
        self.sock.settimeout(None)
        return msgs

    def _discover_channels(self):
        """Pobiera listę kanałów bezpośrednio z UAD Console."""
        # 1. Pobierz indeksy wejść
        self.sock.sendall(b"get /devices/0/inputs\x00")
        msgs = self._recv_blocking(1)
        if not msgs:
            print("❌ Brak odpowiedzi z UAD Console przy odkrywaniu kanałów.")
            return

        input_indices = sorted(int(k) for k in msgs[0]["data"]["children"].keys())
        self._known_input_keys = {str(i) for i in input_indices}

        # 2. Pobierz właściwości każdego wejścia
        for idx in input_indices:
            self.sock.sendall(f"get /devices/0/inputs/{idx}\x00".encode())

        prop_responses = {}
        for msg in self._recv_blocking(len(input_indices)):
            path = msg.get("path", "")
            parts = path.split("/")
            if len(parts) == 5 and parts[4].isdigit():
                prop_responses[int(parts[4])] = msg.get("data", {}).get("properties", {})

        # 3. Buduj listę kanałów (grupuj stereo pary, filtruj ukryte)
        channels = []
        skip = False
        inputs = [(idx, prop_responses.get(idx, {})) for idx in input_indices]

        for i, (idx, props) in enumerate(inputs):
            if skip:
                skip = False
                continue

            name    = props.get("Name",          {}).get("value", f"CH {idx + 1}")
            stereo  = bool(props.get("Stereo",        {}).get("value", False))
            hidden  = bool(props.get("ChannelHidden", {}).get("value", False))

            if hidden or any(s in name.upper() for s in SKIP_NAMES):
                if stereo:
                    skip = True
                continue

            # stereo para: L+R razem
            next_stereo = False
            if i + 1 < len(inputs):
                next_stereo = bool(inputs[i + 1][1].get("Stereo", {}).get("value", False))

            if stereo and next_stereo:
                stereo_name = props.get("StereoName", {}).get("value") or f"{name} LR"
                channels.append({"chid": idx, "name": stereo_name, "stereo": True})
                skip = True
            else:
                channels.append({"chid": idx, "name": name, "stereo": False})

        self.chnam_list  = [c["name"]   for c in channels]
        self.chid_list   = [c["chid"]   for c in channels]
        self.stereo_list = [c["stereo"] for c in channels]

        print(f"✔ Odkryto {len(channels)} kanałów:")
        for c in channels:
            print(f"  chid={c['chid']:2d}  [{'stereo' if c['stereo'] else 'mono  '}]  {c['name']}")

    # ── Diagnostyka sendów ────────────────────────────────────────────────

    def diagnose_sends(self):
        """Subskrybuje możliwe ścieżki głównego fadera i loguje WSZYSTKO nieznane."""
        if not self.chid_list:
            print("❌ Brak kanałów do diagnostyki")
            return
        chid = self.chid_list[0]
        print(f"\n=== DIAGNOSTYKA: chid={chid} '{self.chnam_list[0]}' ===")
        print("=== Poruszyć główny fader w Console — szukaj linii DIAG ===\n")
        # Subskrypcje kandydatów
        candidates = [
            f"/devices/0/inputs/{chid}/sends/0",
            f"/devices/0/inputs/{chid}/sends/1",
            f"/devices/0/inputs/{chid}",
            f"/devices/0/mix",
            f"/devices/0/mix/inputs/{chid}",
        ]
        for p in candidates:
            self._send(f"subscribe {p}")
        self._diag_paths.add("ACTIVE")  # flaga — logi aktywne

    # ── Wczytanie stanu ───────────────────────────────────────────────────

    def _fetch_initial_state(self) -> list:
        paths = {}
        # Sendy (mix 0-3)
        for mix_idx in range(4):
            send_idx = SEND_BASE + mix_idx
            for ch_idx, chid in enumerate(self.chid_list):
                path = f"/devices/0/inputs/{chid}/sends/{send_idx}"
                paths[path] = (ch_idx, mix_idx)
                self.sock.sendall(f"get {path}\x00".encode())
        # Główne fadery (mix 4 = Monitor MIX)
        main_paths = {}
        for ch_idx, chid in enumerate(self.chid_list):
            path = f"/devices/0/inputs/{chid}"
            main_paths[path] = ch_idx
            self.sock.sendall(f"get {path}\x00".encode())

        responses = {}
        for msg in self._recv_blocking(len(paths) + len(main_paths)):
            p = msg.get("path", "")
            if p in paths or p in main_paths:
                responses[p] = msg.get("data", {}).get("properties", {})

        print(f"✔ Wczytano stan {len(responses)}/{len(paths) + len(main_paths)} kanałów z UAD Console")

        state = [[None] * len(self.chid_list) for _ in range(5)]

        for path, (ch_idx, mix_idx) in paths.items():
            props = responses.get(path, {})
            gain  = float(props.get("GainTapered", {}).get("value", 0.0))
            pan   = float(props.get("Pan",          {}).get("value", 0.0))
            mute  = bool( props.get("Bypass",       {}).get("value", False))
            state[mix_idx][ch_idx] = {
                "name":       self.chnam_list[ch_idx],
                "faderValue": round(_tapered_to_db(gain), 2),
                "panValue":   round((pan + 1.0) * 50,  2),
                "isMuted":    mute,
                "isHidden":   False,
            }

        for path, ch_idx in main_paths.items():
            props = responses.get(path, {})
            gain  = float(props.get("FaderLevelTapered", {}).get("value", 0.0))
            pan   = float(props.get("Pan",               {}).get("value", 0.0))
            mute  = bool( props.get("Bypass",            {}).get("value", False))
            state[4][ch_idx] = {
                "name":       self.chnam_list[ch_idx],
                "faderValue": round(_tapered_to_db(gain), 2),
                "panValue":   round((pan + 1.0) * 50,  2),
                "isMuted":    mute,
                "isHidden":   False,
            }

        for mix_idx in range(5):
            for ch_idx in range(len(self.chid_list)):
                if state[mix_idx][ch_idx] is None:
                    state[mix_idx][ch_idx] = {
                        "name":       self.chnam_list[ch_idx],
                        "faderValue": -144.0,
                        "panValue":   50.0,
                        "isMuted":    False,
                        "isHidden":   False,
                    }

        return state

    # ── Subskrypcja zmian ─────────────────────────────────────────────────

    def _subscribe_all(self):
        count = 0
        for ch_idx, chid in enumerate(self.chid_list):
            # Subskrypcja sendów (fader/pan/mute)
            for mix_idx in range(4):
                send_idx = SEND_BASE + mix_idx
                base     = f"/devices/0/inputs/{chid}/sends/{send_idx}"
                self._send(f"subscribe {base}")
                for prop, param in PROP_MAP.items():
                    self._send_to_ch[f"{base}/{prop}"] = (ch_idx, mix_idx, param)
                if self.stereo_list[ch_idx]:
                    base_r = f"/devices/0/inputs/{chid + 1}/sends/{send_idx}"
                    self._send(f"subscribe {base_r}")
                    for prop, param in PROP_MAP.items():
                        self._send_to_ch[f"{base_r}/{prop}"] = (ch_idx, mix_idx, param)
                count += 1

            # Subskrypcja nazwy kanału + główny fader (Monitor MIX = mix_idx 4)
            inp = f"/devices/0/inputs/{chid}"
            self._send(f"subscribe {inp}")
            self._name_to_ch[f"{inp}/Name/value"]       = ch_idx
            self._name_to_ch[f"{inp}/StereoName/value"] = ch_idx
            for prop, param in MAIN_PROP_MAP.items():
                self._send_to_ch[f"{inp}/{prop}"] = (ch_idx, 4, param)
            if self.stereo_list[ch_idx]:
                inp_r = f"/devices/0/inputs/{chid + 1}"
                self._send(f"subscribe {inp_r}")
                for prop, param in MAIN_PROP_MAP.items():
                    self._send_to_ch[f"{inp_r}/{prop}"] = (ch_idx, 4, param)

        # Subskrypcja mierników poziomu
        for ch_idx, chid in enumerate(self.chid_list):
            # Sendy (mix 0-3)
            for mix_idx in range(4):
                send_idx = SEND_BASE + mix_idx
                parent   = f"/devices/0/inputs/{chid}/sends/{send_idx}/meters/0"
                mpath    = f"{parent}/MeterLevel/value"
                self._send(f"subscribe {parent}")
                self._meter_to_ch[mpath] = (ch_idx, mix_idx)
            # Główny kanał (Monitor MIX = mix_idx 4)
            parent = f"/devices/0/inputs/{chid}/meters/0"
            mpath  = f"{parent}/MeterLevel/value"
            self._send(f"subscribe {parent}")
            self._meter_to_ch[mpath] = (ch_idx, 4)

        # Subskrypcja struktury wejść (wykrywanie dodania/usunięcia kanałów)
        self._send("subscribe /devices/0/inputs")

        print(f"✔ Subskrybuję {count} sendów + nazwy + metery + struktura wejść")

    # ── TCP send / recv ───────────────────────────────────────────────────

    def _send(self, msg: str):
        if not self._connected:
            return
        with self._lock:
            try:
                self.sock.sendall((msg + "\x00").encode())
            except OSError as e:
                print(f"TCP send error: {e}")
                self._connected = False

    def _keepalive(self):
        while self._connected:
            time.sleep(3)
            self._send("set /Sleep false")

    def _recv_loop(self):
        buf = b""
        while self._connected:
            try:
                data = self.sock.recv(4096)
                if not data:
                    break
                buf += data
                while b"\x00" in buf:
                    msg, buf = buf.split(b"\x00", 1)
                    if msg:
                        self._handle_message(msg)
            except OSError:
                break

    def _handle_message(self, msg: bytes):
        try:
            data = json.loads(msg.decode())
        except Exception:
            return

        path = data.get("path", "")

        # 0. Diagnostyka — loguj wszystkie zmiany oprócz mierników i MeterPulse
        if self._diag_paths and "/meters/" not in path and "MeterPulse" not in path:
            print(f"DIAG  {path}  =  {data.get('data')!r}")

        # 1. Zmiana fader / pan / mute
        if path in self._send_to_ch:
            ch_idx, mix_idx, param = self._send_to_ch[path]
            raw = data.get("data")
            if raw is None:
                return
            if param == "faderValue":
                value = round(_tapered_to_db(float(raw)), 2)
            elif param == "panValue":
                value = round((float(raw) + 1.0) * 50, 2)
            elif param == "isMuted":
                value = bool(raw)
            else:
                return
            if self.on_external_change:
                self.on_external_change(ch_idx, mix_idx, {param: value})
            return

        # 2. Aktualizacja miernika poziomu
        if path in self._meter_to_ch:
            ch_idx, mix_idx = self._meter_to_ch[path]
            raw = data.get("data")
            if raw is not None:
                with self._meter_lock:
                    self._meter_levels[(ch_idx, mix_idx)] = float(raw)
                    self._meter_dirty = True
            return

        # 3. Zmiana nazwy kanału
        if path in self._name_to_ch:
            new_name = data.get("data")
            if isinstance(new_name, str) and new_name:
                ch_idx = self._name_to_ch[path]
                self.chnam_list[ch_idx] = new_name
                print(f"  NAME   ch_idx={ch_idx} → {new_name!r}")
                if self.on_config_changed:
                    self.on_config_changed(None)
            return

        # 3. Zmiana struktury wejść (kanały dodane / usunięte)
        if path == "/devices/0/inputs" and not self._reconnecting:
            children = data.get("data", {})
            if isinstance(children, dict):
                new_keys = set(children.get("children", {}).keys())
                if new_keys and new_keys != self._known_input_keys:
                    print(f"🔄 Zmiana struktury kanałów — ponowne odkrywanie...")
                    threading.Thread(target=self._full_reconnect, daemon=True).start()

    def _meter_flush_loop(self):
        """Co 80ms wysyła zbatch zaktualizowanych mierników do klientów."""
        while self._connected:
            time.sleep(0.08)
            if not self._meter_dirty:
                continue
            with self._meter_lock:
                snapshot = dict(self._meter_levels)
                self._meter_dirty = False
            if self.on_meters_update and snapshot:
                self.on_meters_update(snapshot)

    def _full_reconnect(self):
        self._reconnecting = True
        print("🔄 Reconnect UAD Console...")
        self._connected = False
        try:
            self.sock.close()
        except Exception:
            pass
        time.sleep(0.4)   # czekaj na wyjście recv_loop / keepalive
        self._send_to_ch = {}
        self._name_to_ch = {}
        new_state = self.connect()
        self._reconnecting = False
        if new_state and self.on_config_changed:
            self.on_config_changed(new_state)

    # ── Sterowanie parametrami ────────────────────────────────────────────

    def _set_param(self, chid: int, mix_idx: int, param: str, value):
        if mix_idx == 4:
            actual_param = (param
                .replace("GainTapered/value", "FaderLevelTapered/value")
                .replace("Bypass/value", "Mute/value"))
            self._send(f"set /devices/0/inputs/{chid}/{actual_param} {value}")
        else:
            send_idx = SEND_BASE + mix_idx
            self._send(f"set /devices/0/inputs/{chid}/sends/{send_idx}/{param} {value}")

    def set_fader(self, ch_idx: int, mix_idx: int, fader_val: float):
        chid    = self.chid_list[ch_idx]
        tcp_val = round(max(0.0, min(1.0, _db_to_tapered(fader_val))), 6)
        self._set_param(chid, mix_idx, "GainTapered/value", tcp_val)
        if self.stereo_list[ch_idx]:
            self._set_param(chid + 1, mix_idx, "GainTapered/value", tcp_val)

    def set_pan(self, ch_idx: int, mix_idx: int, pan_val: float):
        chid    = self.chid_list[ch_idx]
        tcp_val = round(max(-1.0, min(1.0, (pan_val - 50) / 50.0)), 6)
        self._set_param(chid, mix_idx, "Pan/value", tcp_val)
        if self.stereo_list[ch_idx]:
            self._set_param(chid + 1, mix_idx, "Pan/value", tcp_val)

    def set_mute(self, ch_idx: int, mix_idx: int, muted: bool):
        chid = self.chid_list[ch_idx]
        val  = 1 if muted else 0
        self._set_param(chid, mix_idx, "Bypass/value", val)
        if self.stereo_list[ch_idx]:
            self._set_param(chid + 1, mix_idx, "Bypass/value", val)


# -------------------------------------------------------
#   STARTUP
# -------------------------------------------------------

uad = UADConsole()
_initial_state = uad.connect()


# -------------------------------------------------------
#   STATE MANAGEMENT
# -------------------------------------------------------

def create_mix(channel_names: list[str]) -> list[dict]:
    return [
        {"name": n, "faderValue": -144.0, "panValue": 50.0, "isMuted": False, "isHidden": False}
        for n in channel_names
    ]


current_state: list[list[dict]] = _initial_state if _initial_state else [
    create_mix(uad.chnam_list) for _ in range(5)
]


# -------------------------------------------------------
#   PRESETS FILE IO
# -------------------------------------------------------

def load_presets_file() -> dict:
    if not os.path.exists(CONFIG_FILE):
        return {}
    try:
        with open(CONFIG_FILE) as f:
            return json.load(f)
    except Exception:
        return {}


def save_presets_file(presets: dict):
    with open(CONFIG_FILE, "w") as f:
        json.dump(presets, f, indent=4)


# -------------------------------------------------------
#   FLASK & SOCKET.IO
# -------------------------------------------------------

app      = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")


def handle_external_change(ch_idx: int, mix_idx: int, updates: dict):
    try:
        current_state[mix_idx][ch_idx].update(updates)
        socketio.emit("state_updated", {
            "mixIndex":     mix_idx,
            "channelIndex": ch_idx,
            "update":       updates,
        })
    except IndexError:
        pass


def handle_config_change(new_state):
    """Wywoływane gdy zmienią się nazwy kanałów lub struktura wejść w UAD Console."""
    global current_state
    if new_state is not None:
        # Pełna zmiana struktury — zastąp cały stan
        current_state = new_state
        print("📡 Pełna zmiana config → sync_state")
    else:
        # Tylko zmiana nazw — zaktualizuj nazwy we wszystkich miksach
        for mix_idx in range(4):
            for ch_idx, name in enumerate(uad.chnam_list):
                if ch_idx < len(current_state[mix_idx]):
                    current_state[mix_idx][ch_idx]["name"] = name
        print("📡 Zmiana nazw kanałów → sync_state")
    socketio.emit("sync_state", current_state)
    socketio.emit("channel_info", {"stereo": uad.stereo_list})


def handle_meters_update(levels: dict):
    """Wywoływane co 80ms z aktualnymi poziomami mierników."""
    payload = [{"c": ch, "m": mix, "v": round(v, 1)}
               for (ch, mix), v in levels.items()]
    socketio.emit("meters_batch", payload)


uad.on_external_change = handle_external_change
uad.on_config_changed  = handle_config_change
uad.on_meters_update   = handle_meters_update


@socketio.on("connect")
def handle_connect():
    print("Client connected")
    emit("sync_state", current_state)
    emit("presets_list", list(load_presets_file().keys()))
    emit("channel_info", {"stereo": uad.stereo_list})


@socketio.on("update_channel")
def handle_update(data):
    mix_idx = data.get("mixIndex")
    ch_idx  = data.get("channelIndex")
    update  = data.get("update")

    if mix_idx is None or ch_idx is None or not update:
        return

    try:
        current_state[mix_idx][ch_idx].update(update)
        emit("state_updated", data, broadcast=True, include_self=False)

        if "faderValue" in update:
            uad.set_fader(ch_idx, mix_idx, float(update["faderValue"]))
        if "panValue" in update:
            uad.set_pan(ch_idx, mix_idx, float(update["panValue"]))
        if "isMuted" in update:
            uad.set_mute(ch_idx, mix_idx, bool(update["isMuted"]))

    except IndexError:
        print("Error: channel index out of range")


@socketio.on("set_diagnostics")
def handle_set_diagnostics(data):
    enabled = bool(data.get("enabled", False))
    if enabled:
        uad._diag_paths.add("ACTIVE")
        for path in ["/", "/devices", "/devices/0", "/plugins", "/console", "/application"]:
            uad._send(f"subscribe {path}")
        print("🔍 Diagnostics ON — logowanie wszystkich zmian UAD (oprócz mierników)")
    else:
        uad._diag_paths.clear()
        print("🔍 Diagnostics OFF")


@socketio.on("init_setup")
def init_setup(data):
    global current_state
    count = int(data.get("count", 8))
    names = [f"CH {i + 1}" for i in range(count)]
    current_state = [create_mix(names) for _ in range(4)]
    print(f"✔ Re-initialized mixer with {count} channels")
    emit("sync_state", current_state, broadcast=True)


@socketio.on("save_preset")
def save_preset(preset_name):
    if not preset_name:
        return
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


# -------------------------------------------------------
#   FRONTEND (Vite dev server)
# -------------------------------------------------------

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
_vite_proc: subprocess.Popen | None = None


def start_frontend():
    global _vite_proc
    _vite_proc = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=PROJECT_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )

    def _pipe():
        for line in _vite_proc.stdout:
            print(f"[vite] {line.decode(errors='replace').rstrip()}")

    threading.Thread(target=_pipe, daemon=True).start()
    print("▶ Vite dev server starting → http://localhost:8080")


def _stop_frontend():
    if _vite_proc and _vite_proc.poll() is None:
        _vite_proc.terminate()
        try:
            _vite_proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            _vite_proc.kill()


atexit.register(_stop_frontend)


if __name__ == "__main__":
    start_frontend()
    print("🚀 Server v2 (TCP) running on http://localhost:5050")
    socketio.run(app, host="0.0.0.0", port=5050, allow_unsafe_werkzeug=True)
