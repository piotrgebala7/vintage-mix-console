# Cue Monitor System

Personal monitor mixing console for live performance. Controls UAD Console CUE sends and main channel faders via a web interface accessible from any device on the local network — phone, tablet, or desktop.

## Architecture

```
UAD Console (macOS)
       │  TCP :4710
       ▼
  server_v2.py  ←→  Socket.IO :5050
       │
       ▼
  React frontend (Vite)
  accessible on :5173 (dev) or as built static files
```

The Python server connects to UAD Console's local TCP API at startup, discovers channels, reads their state, and subscribes to live updates. The React frontend connects via Socket.IO and renders a full mixing console UI.

## Requirements

- **UAD Console** running on the same Mac
- **Python 3.11+**
- **Node.js 18+**

Python dependencies:
```
pip install flask flask-socketio
```

## Running

**Server:**
```bash
python server_v2.py
```

**Frontend (development):**
```bash
npm install
npm run dev
```

Open `http://<mac-ip>:5173` on any device on the same network.

## Mixes

| Mix | UAD path | Controls |
|-----|----------|----------|
| MIX A | `sends/2` | CUE 1 faders |
| MIX B | `sends/3` | CUE 2 faders |
| MIX C | `sends/4` | CUE 3 faders |
| MIX D | `sends/5` | CUE 4 faders |
| MONITOR | main input | Main channel faders (`FaderLevelTapered`) |

Each mix has an independent group configuration and bypass state.

## Features

### Channel strip
- **Fader** — UAD taper curve, pixel-perfect match to UAD Console scale (+12 to -∞ dB)
- **Pan knob** — grayed out and disabled on stereo channels
- **Mute** — `Bypass/value` on sends, `Mute/value` on main channel
- **VU meter** — live from UAD Console, -77 to 0 dBFS; green / yellow ≥ -6 / red ≥ 0
- **Channel name** — editable, synced from UAD Console

### Groups
- Assign channels to groups A / B / C / D — per mix, independent across mixes
- Moving any fader in a group moves all others by the same delta (snapshot-based, no drift)
- **Bypass** button per channel — temporarily removes group link without clearing assignment

### Views
- **Modern** — clean dark UI
- **Vintage** — retro analog console aesthetic

### Mobile / touch
- Pan knob: horizontal drag (left/right), blocks page scroll on touch
- Fader: tap to select, then drag — prevents accidental changes during horizontal swipe
- Desktop: faders respond immediately, no tap-to-select required

### Diagnostics
Configuration → Diagnostics Mode ON logs all non-meter UAD Console TCP messages to the server console. Useful for mapping plugin parameter paths.

## UAD Console TCP protocol (port 4710)

Messages are NULL-terminated JSON strings.

**Subscribe to a parent object** to receive property change notifications:
```
subscribe /devices/0/inputs/0/sends/2\0
```
UAD Console sends a notification whenever a child property changes:
```json
{"path": "/devices/0/inputs/0/sends/2/GainTapered/value", "data": 0.7818}
```

**Get a snapshot of an object:**
```
get /devices/0/inputs/0\0
```

**Set a property:**
```
set /devices/0/inputs/0/sends/2/GainTapered/value 0.7818\0
```

### Key paths

| Path | Description |
|------|-------------|
| `/devices/0/inputs` | List of all inputs |
| `/devices/0/inputs/{chid}` | Channel: `Name`, `Stereo`, `ChannelHidden`, `FaderLevelTapered`, `Pan`, `Mute` |
| `/devices/0/inputs/{chid}/sends/{n}` | CUE send: `GainTapered`, `Pan`, `Bypass` |
| `/devices/0/inputs/{chid}/sends/{n}/meters/0` | Send meter: `MeterLevel` (dBFS) |
| `/devices/0/inputs/{chid}/meters/0` | Main channel meter: `MeterLevel` (dBFS) |
| `/MeterPulse/value` | Global meter heartbeat counter (filtered out) |

`SEND_BASE = 2` — UAD CUE sends start at index 2.

### Fader taper

`GainTapered` / `FaderLevelTapered` are 0–1 normalized values matching UAD Console's visual fader position:

| dB | Tapered |
|----|---------|
| +12 | 1.0 |
| 0 | 0.7818 |
| -6 | 0.69 |
| -20 | 0.51 |
| -56 | 0.18 |
| -∞ | 0.0 |

## File overview

| File | Description |
|------|-------------|
| `server_v2.py` | Python backend — UAD TCP bridge + Flask-SocketIO server |
| `src/components/console/MixingConsole.tsx` | Main app state, socket handling, mix/group logic |
| `src/components/console/ChannelStrip.tsx` | Modern channel strip component |
| `src/components/console/VintageChannelStrip.tsx` | Vintage channel strip, pan knob, fader |
| `src/components/console/Fader.tsx` | Fader slider (Radix UI) with UAD taper scale |
| `src/components/console/PanKnob.tsx` | Pan knob with touch horizontal drag |
| `src/components/console/VUMeter.tsx` | VU meter bar (-77 to 0 dBFS) with peak hold |
| `src/components/console/MixSelector.tsx` | Mix A–D + Monitor selector panel |
