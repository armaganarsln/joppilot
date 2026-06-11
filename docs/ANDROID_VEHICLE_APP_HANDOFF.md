# Handoff Spec: Jöppilot Vehicle — Native Android App

> Developer handoff for building the **vehicle-side phone app** as a native Android module
> inside this repository, fully interoperable with the existing web operator console.
> Target stack: **Kotlin · Jetpack Compose · Material 3 · Android Studio**.
> The web testbed it replaces is [`src/components/TestVehicleScreen.tsx`](../src/components/TestVehicleScreen.tsx) —
> treat that file as the executable reference for any behavior this spec under-specifies.

---

## 1. Overview

Today a phone joins the fleet by opening the web app in a browser and tapping
"Enter Test Vehicle Mode". The browser version works but hits platform walls:
no streaming with the screen off, no foreground service, fragile sensor access,
and battery/wake management we can't control.

**Jöppilot Vehicle** is the same role as a native app: the phone *is* the Jöppli
vehicle. It streams its camera over WebRTC to the operator console, uploads
telemetry to Firestore, executes remote-drive commands with the graded failsafe,
and proposes Mode 1 maneuvers for operator confirmation.

**Non-goals:** the operator console, dashboards, booking. Those stay in the web app.
The app must interoperate with the **unchanged** web operator console — every data
contract in §8 is load-bearing; do not rename fields.

User context: one person holds the phone (mounted on a test rig or handheld),
walking or driving a route in Zürich Alt-Wiedikon or Glarus while a second person
operates from the web console. Sunlight-readable dark HUD, one-handed reachability
for the four bottom actions, and glanceable state at 2 m distance drive the design.

---

## 2. Repository integration

```
joppilot/
├─ android/                  ← new Gradle project (this spec)
│  ├─ settings.gradle.kts
│  ├─ app/
│  │  ├─ google-services.json   ← from Firebase console, project gen-lang-client-0975513028
│  │  └─ src/main/...
├─ src/                      ← existing web app (unchanged)
└─ docs/ANDROID_VEHICLE_APP_HANDOFF.md
```

- Add to root `.gitignore`: `android/.gradle/`, `android/local.properties`, `android/app/build/`, `android/build/`.
- `minSdk 26`, `targetSdk 35`, Kotlin 2.x, Compose BOM current stable.
- Dependencies:
  - `com.google.firebase:firebase-bom` ≥ 33.x → `firebase-firestore` (must support **named databases**)
  - WebRTC: `io.getstream:stream-webrtc-android` (maintained prebuilt of libwebrtc; the old `org.webrtc:google-webrtc` artifact is stale)
  - `com.google.android.gms:play-services-location` (FusedLocationProvider)
  - `androidx.camera` is **not** needed — use libwebrtc's `Camera2Enumerator`/`Camera2Capturer` so frames feed the VideoTrack directly.
- **Firestore named database (critical):** the project uses Firestore Enterprise with a
  named DB. The default instance will silently read an empty database. Initialize with:

  ```kotlin
  val db = FirebaseFirestore.getInstance(FirebaseApp.getInstance(),
      "ai-studio-f9949ca3-3243-426c-999c-8d254d4c9b73")
  ```

- **No auth required**: the teleop collections (`test_vehicles`, `webrtc_signaling`,
  `control_locks`, `teleop_sessions`) are intentionally open for the testbed (decision
  RD-1). Do not add Firebase Auth to the vehicle app yet; the rules schema-validate
  writes instead (see §8.1 — send *all* required fields or writes are rejected).
- ICE servers: `GET {BASE_URL}/api/ice-servers` → `{ "iceServers": [...] }` with
  short-lived Cloudflare TURN credentials. `BASE_URL` is a `BuildConfig` field
  (debug default: `http://10.0.2.2:3001` for emulator against the local dev server;
  configurable to a cloudflared tunnel URL). On any failure fall back to
  `stun:stun.l.google.com:19302` — same-network teleop still works STUN-only.
  Cache the result per process (24 h credential TTL).

---

## 3. Layout

Two screens plus overlays. Both are **portrait-locked by default with full
landscape support** (the camera HUD is better in landscape; telemetry blocks
reflow, they do not rotate).

### 3.1 Vehicle Select (setup)
- Centered card, max width 400dp, on `surface-darkest`.
- Vertical stack: truck icon (64dp, `joppli-blue`), app title, subtitle, workspace
  toggle (Zürich / Glarus `SegmentedButton`), two vehicle buttons side-by-side
  (equal flex, 72dp tall), cancel text-button.
- Vehicle ids are fixed: `v1`, `v2`. Display names depend on workspace:
  Zürich → `JÖP-01` / `JÖP-02`; Glarus → `GL-01` / `GL-02`.

### 3.2 Drive HUD (main screen)
Z-ordered layers, bottom to top:

| Layer | Content | Position |
|---|---|---|
| 0 | Camera preview (local `VideoTrack` rendered in `SurfaceViewRenderer`), `object-cover` | full-bleed |
| 1 | Scanline/grid overlay, 40% opacity (cosmetic, skip if it costs frames) | full-bleed |
| 1 | Crosshair reticle, 30% opacity | center |
| 2 | Top app bar 80dp: vehicle name + truck icon · "SIMULATOR ACTIVE" · **CMD path chip** · **AV state badge** · Exit button | top |
| 2 | Telemetry block (GPS, speed/heading, battery, camera link), mono 12sp, on `black @ 75%`, 16dp radius | bottom-start, 24dp inset |
| 2 | Remote-ingress block (wheel angle dial + throttle bar), on `black @ 85%` | bottom-end, 24dp inset |
| 3 | Failsafe banner (full-width strip, 40dp) | top edge, above app bar |
| 3 | Pending-proposal strip (40dp, `joppli-blue @ 15%`) | directly above action row |
| 4 | Action row: 5 equal buttons, 56dp min height, 16dp gap, on `surface-dark` | bottom |
| 5 | Command flash overlay / maneuver verdict overlay (full screen) | all |

Action row buttons (left → right): **Propose Maneuver** (joppli-blue, opens menu) ·
**Request Assistance** (joppli-red, opens cause menu) · **Engage Manual** (#232631) ·
**Trigger MRM** (#7d19c4) · **Back to Autonomous** (#263e18). On width < 600dp the
row wraps to a 2×3 grid (web stacks vertically; on a phone a grid keeps all actions
above the thumb line — that's why we deviate).

---

## 4. Design tokens

Single source of truth: [`src/index.css`](../src/index.css). Mirror into
`ui/theme/Color.kt`, `Type.kt`, `Motion.kt`. Use token names in code, not hex.

### 4.1 Color
| Token | Value | Usage |
|---|---|---|
| `joppli-green` | `#6DBA32` | AUTONOMOUS badge, confirm actions, GPS/online accents |
| `joppli-blue` | `#326CB8` | Propose Maneuver, throttle bar, info accents |
| `joppli-yellow` | `#FFCB00` | MANUAL badge, SPEED_CAP banner, cloud-relay chip |
| `joppli-red` | `#F55045` | Request Assistance, E-STOP/link-lost banner, rejected verdict |
| `joppli-dark` | `#0F1116` | text-on-light, dark fills |
| `surface-darkest` | `#0c0d12` | screen background |
| `surface-dark` | `#14151b` | app bar, action row, cards |
| `surface-menu` | `#1c1d26` | dropdown menus |
| `surface-button` | `#1e202b` | vehicle-select buttons |
| `mrm-purple` | `#7d19c4` (hover `#8e25dd`) | Trigger MRM button; badge `#9a28eb` |
| `slowdown-orange` | `#e07b1f` | failsafe stage-2 banner |
| `autonomous-green-dark` | `#263e18` (hover `#345521`) | Back to Autonomous button |
| `on-dark` | `#f5f5f7` | primary text on dark |
| `on-dark-muted` | `white @ 50–60%` | labels |
| borders on dark | `white @ 10%` (`@ 20%` dividers) | hairlines |

### 4.2 Typography
| Token | Spec | Usage |
|---|---|---|
| `font-sans` | **Satoshi** 400/500/700/900 (bundle TTFs from Fontshare; fallback Poppins) | all UI text |
| `font-mono` | **Geist Mono** 400–700 (bundle; fallback JetBrains Mono) | telemetry, coordinates, seq numbers |
| `label-hud` | 10sp / 900 / letterSpacing 0.2em / UPPERCASE | section labels, chips |
| `value-telemetry` | 12sp / 700 / mono | GPS, speed, battery values |
| `badge-state` | 12sp / 900 / 0.2em / UPPERCASE | AV state badge |
| `overlay-title` | 36–48sp / 900 / 0.15em | command flash text |

The HUD is uppercase-tracking-wide by design (glanceable at distance). Set
TalkBack `contentDescription` in sentence case — never let the screen reader
spell out tracked uppercase.

### 4.3 Motion (MD3 tokens, already used by the web app)
| Token | Value |
|---|---|
| `easing-standard` | `CubicBezierEasing(0.2f, 0f, 0f, 1f)` |
| `easing-emphasized-decelerate` | `CubicBezierEasing(0.05f, 0.7f, 0.1f, 1f)` |
| `easing-emphasized-accelerate` | `CubicBezierEasing(0.3f, 0f, 0.8f, 0.15f)` |
| `duration-state` | 150 ms |
| `duration-enter` | 300 ms |

### 4.4 Shape & spacing
Radii: cards/overlays 24dp (`rounded-2xl`/`3xl`), buttons 12dp, chips 8dp, menus 12dp.
Spacing scale: 4 / 8 / 12 / 16 / 24dp. Screen insets 24dp. Min touch target **48dp**.

---

## 5. Components

| Component | Compose mapping | Props / notes |
|---|---|---|
| AV state badge | custom `Surface` chip | `avState`; color per state table §6.1; pulse = infinite alpha 1→0.6, 1 s, only for ASSISTANCE_REQUESTED and MRM |
| Cmd path chip | `Text` in app bar | `CMD: P2P DIRECT` (`joppli-green`) when DataChannel open, else `CMD: CLOUD RELAY` (`joppli-yellow`) |
| Failsafe banner | full-width `Surface` strip | variant per stage §6.2; slides in from top, `duration-enter`, `easing-emphasized-decelerate`; announce via live region + haptic |
| Telemetry block | `Column` of mono rows | GPS lat/lng (6 decimals), speed `km/h` (m/s × 3.6, 1 decimal), heading °, battery %, camera link status |
| Remote-ingress block | dial + progress | wheel: 24dp dashed circle rotating to `steeringAngle` (animate 100 ms, `easing-standard`); throttle: horizontal bar, `joppli-blue`, animate width |
| Action button | `Button` w/ custom colors | full caps 12sp/700/0.15em; pressed scale 0.97 (MD3 press affordance, 150 ms `easing-standard`) |
| Maneuver/cause menu | `DropdownMenu` (anchored above button) | items 14sp/700, 44dp rows, divider hairlines; catalog §8.4 |
| Pending-proposal strip | `Surface` `joppli-blue @ 15%`, top border `joppli-blue @ 40%` | label + proposal text + pinging dot; dismissed only by a verdict |
| Command flash overlay | full-screen `Box`, scrim `joppli-red @ 90%` + blur | icon 96dp, "OPERATOR TRANSMITTED COMMAND:", command 48sp; auto-dismiss 3 s |
| Maneuver verdict overlay | full-screen, `joppli-green @ 85%` (confirmed) / `joppli-red @ 85%` (rejected) | "MANEUVER APPROVED / REJECTED" 40sp + proposal label; auto-dismiss 4 s |
| Vehicle select button | `OutlinedButton` 72dp | 2dp border `white @ 10%`, focus/hover border `joppli-blue`, mono 18sp |

---

## 6. States and interactions

### 6.1 AV state machine (authoritative — mirror exactly)
| State | Badge | Entered by | Exits to |
|---|---|---|---|
| `AUTONOMOUS` | green bg / dark text | app start; "Back to Autonomous"; operator `PROCEED` | any |
| `ASSISTANCE_REQUESTED` | red / white, pulse | "Request Assistance" + cause | `MANUAL` (operator `TAKE_OVER`), `AUTONOMOUS`, `MRM` |
| `MANUAL` | yellow / dark | operator `TAKE_OVER`; "Engage Manual" | `AUTONOMOUS` (`PROCEED`), `MRM` |
| `MRM` | `#9a28eb` / white, pulse | "Trigger MRM"; failsafe SAFE_STOP; operator E-STOP; geofence | `MANUAL` (`TAKE_OVER` / E-STOP release), `AUTONOMOUS` |
| `REMOTE_OPERATING` | blue / white | (reserved) | — |

Remote drive commands (`steer`/`throttle`) are applied **only while `MANUAL`**.
On entering `MANUAL`, stamp the heartbeat ref with `now` (grace period before the
watchdog can fire).

### 6.2 Graded failsafe (runs on a 500 ms watchdog, only while `MANUAL`)
Constants from [`src/lib/driveModel.ts`](../src/lib/driveModel.ts) — keep in lockstep:

| Stage | Trigger (ms since last heartbeat) | Behavior | UI |
|---|---|---|---|
| `NOMINAL` | ≤ 1500 | none | no banner |
| `SPEED_CAP` | > 1500 | clamp throttle ≤ 50 | yellow banner "LINK DEGRADED — FAILSAFE STAGE 1: SPEED CAPPED AT 50%" |
| `SLOWDOWN` | > 2500 | throttle = min(throttle, 50) − 10 per tick, floor 0 | orange banner "...STAGE 2: CONTROLLED SLOWDOWN", pulse |
| `SAFE_STOP` | > 4500 | zero controls, `avState = MRM` (latched), write MRM doc update, alert beep | red banner "...STAGE 3: SAFE STOP ENGAGED (MRM)", pulse |

Any frame on the DataChannel **or** a fresh `operatorHeartbeat` in Firestore
refreshes the heartbeat. The watchdog must run with zero connectivity (it only
reads local state). The MRM doc write is best-effort.

### 6.3 Interactions
| Element | Gesture | Behavior |
|---|---|---|
| Action buttons | tap | immediate Firestore write + local state change; haptic `CLICK` |
| Propose Maneuver | tap → menu → item | writes `maneuverProposal` (pending); button disabled (40% alpha) while one is pending |
| Exit | tap | write `isActive: false` (merge), stop capturer, close PeerConnection, pop to Vehicle Select |
| Command flash overlay | none (no tap-through) | blocks input 3 s — operator commands must be acknowledged visually before the user acts |
| System back | on Drive HUD | same as Exit (never leave a ghost vehicle active) |
| E-STOP received | — | zero controls + `WAIT` overlay + double haptic `HEAVY_CLICK` |

---

## 7. Responsive behavior
| Class | Changes |
|---|---|
| Phone portrait (default) | layout per §3.2; action row 2×3 grid < 600dp |
| Phone landscape | telemetry block and ingress block shrink to 60% scale; action row single 5-up row |
| Tablet ≥ 840dp | center HUD content at max 1100dp; action row max width 800dp centered |

---

## 8. Data contracts (interop — do not rename anything)

### 8.1 `test_vehicles/{vehicleId}` — telemetry upload, every 500 ms, `set(..., merge)`
Security rules **reject** writes missing any required field:

```json
{
  "id": "v1",                      // required
  "name": "JÖP-01",                // required — workspace display name
  "isActive": true,                // required
  "avState": "AUTONOMOUS",         // required
  "lat": 47.3712, "lng": 8.5135,   // required
  "speed": 0.0,                    // required, m/s
  "heading": 132,                  // required, deg
  "battery": 87,                   // required, % from BatteryManager
  "assistanceCause": null,         // only while ASSISTANCE_REQUESTED
  "updatedAt": 1765400000000       // required, epoch ms
}
```

Operator-written fields to observe on the same doc: `steeringAngle`, `throttle`,
`operatorHeartbeat`, `operatorCommand` + `operatorCommandSeq` (+ legacy
`operatorCommandTimestamp`), `maneuverProposal`.
**Dedupe rule:** act on a command only if `operatorCommandSeq` is strictly greater
than the last seq handled (one shared counter with DataChannel frames). Ignore
maneuver verdicts whose `decidedAt` is older than 15 s (stale doc replay on mount).

### 8.2 `webrtc_signaling/{vehicleId}` — vehicle is the offerer
1. Acquire camera (back camera, 640×480 @ 24 fps target), create `PeerConnection`
   with ICE servers from §2, `addTrack(videoTrack)`.
2. **Create `DataChannel("control", ordered = true)` before the offer.**
3. `createOffer` → `setLocalDescription` → `setDoc`:
   `{ id, offer: "{\"sdp\":...,\"type\":\"offer\"}", answer: null, candidates_vehicle: "[]", candidates_operator: "[]", updatedAt }`
   (`offer`/`answer`/candidates are **JSON-stringified strings**, not maps.)
4. Each local ICE candidate: append to the full array, rewrite `candidates_vehicle`.
5. Snapshot-listen for `answer` (apply once) and `candidates_operator` (apply each
   unseen candidate, keyed by its JSON string).

### 8.3 DataChannel frames (operator → vehicle), JSON text
| Frame | Shape | Vehicle action |
|---|---|---|
| drive | `{"t":"drive","steer":-12,"throttle":40,"seq":n,"ts":ms}` | if `seq` > last drive seq and `MANUAL`: apply steer/throttle |
| heartbeat | `{"t":"hb","ts":ms}` | liveness stamp only |
| e-stop | `{"t":"estop","seq":n,"ts":ms}` | zero controls; treat as `WAIT` command (dedupe via shared command seq) |
| e-stop release | `{"t":"estop_release","seq":n,"ts":ms}` | treat as `TAKE_OVER` |
| maneuver verdict | `{"t":"maneuver_decision","id":"m_...","decision":"confirmed","by":"email","label":"...","ts":ms}` | verdict overlay; dedupe by `id:decision` |

**Every received frame refreshes the failsafe heartbeat.** The same commands also
arrive via Firestore (cloud mirror) — the seq dedupe makes dual delivery idempotent.

### 8.4 Maneuver proposal (vehicle → operator), on the `test_vehicles` doc
```json
"maneuverProposal": { "id": "m_1765400000000", "kind": "unprotected_turn",
  "label": "Unprotected left turn across tram lane",
  "proposedAt": 1765400000000, "status": "pending" }
```
Catalog (`kind` → label) from [`src/lib/vehicleState.ts`](../src/lib/vehicleState.ts):
`overtake_parked` → "Overtake parked delivery van" · `unprotected_turn` → "Unprotected left turn across tram lane" ·
`construction_pass` → "Pass through signed construction zone" · `reverse_dock` → "Reverse into collection bay".
Operator sets `status` to `confirmed`/`rejected` + `decidedBy`/`decidedAt`.
Assistance causes (Request Assistance menu): `unmapped_obstacle`, `pedestrian_intent_unclear`,
`construction_zone`, `ambiguous_right_of_way`.

---

## 9. Edge cases

- **Permissions denied** (camera/location): non-dismissable explainer card on the
  Drive HUD with a "Open settings" button; telemetry still uploads with last-known
  or default coordinates (47.3712, 8.5135) so the vehicle stays visible on the console.
- **Camera in use / capture error**: show "CAMERA LINK: OFFLINE" in telemetry block,
  retry acquisition every 5 s; signaling proceeds (DataChannel still works without video).
- **No GPS fix**: keep last fix, append "(STALE)" after 10 s without updates. Derive
  speed from displacement when `location.speed == 0` (mirror the web logic).
- **App backgrounded / screen off**: run capture + telemetry in a **foreground service**
  (`camera|location` types) with a persistent notification "JÖP-01 streaming to operator".
  Acquire a partial wake lock for the session. This is the headline advantage over the
  browser version — do not let the OS kill an active teleop session.
- **Network handover (Wi-Fi ↔ cellular)**: on `PeerConnection` state `FAILED`/`DISCONNECTED`,
  attempt ICE restart (new offer with `iceRestart = true`, rewrite signaling doc).
  Cmd path chip falls back to CLOUD RELAY meanwhile; the failsafe keeps grading on its own.
- **Process death / crash**: operator console already treats a stale vehicle as inactive;
  on next launch always start at Vehicle Select and overwrite the doc.
- **Clock skew**: never compare local clock against operator timestamps for command
  freshness — sequence numbers only (this bug was already fixed once in the web app).
- **Long text / i18n**: proposal labels and banners may grow ~30% in German. Banners
  use two-line max with marquee disabled; menu rows wrap.

---

## 10. Animation / motion

| Element | Trigger | Animation | Duration | Easing |
|---|---|---|---|---|
| Failsafe banner | stage change | slide down + fade in | 300 ms | emphasized-decelerate |
| Command/verdict overlay | frame received | fade + scale 0.95→1 | 300 ms | emphasized-decelerate |
| Overlay dismiss | 3–4 s timer | fade out | 200 ms | emphasized-accelerate |
| Steering dial | new angle | rotate to angle | 100 ms | standard |
| Throttle bar | new value | width | 100 ms | standard |
| Buttons | press | scale 0.97 | 150 ms | standard |
| State badge pulse | while ASSISTANCE_REQUESTED / MRM | alpha 1↔0.6 loop | 1 s | linear |
| Pinging dots | while pending | scale+fade ripple | 1 s | linear |

Respect "Remove animations" (`Settings.Global.ANIMATOR_DURATION_SCALE == 0` /
reduce-motion): disable pulses, ripples, and press scale; keep instant state swaps.

---

## 11. Accessibility

- All action buttons: 48dp+ targets, `contentDescription` in sentence case
  ("Propose a maneuver for operator confirmation").
- Failsafe banners and AV state changes: `liveRegion = assertive` — an operator-side
  link loss must be announced even when the user isn't looking.
- Command flash + verdict overlays: announce full text; double `HEAVY_CLICK` haptic on
  E-STOP, single `CLICK` on other commands (works through gloves/pocket).
- Focus order (keyboard / switch access): app bar → telemetry → action row left-to-right;
  overlays trap focus while visible.
- Contrast: all text on dark surfaces ≥ 4.5:1 (the `white @ 40%` hint labels are
  decorative duplicates of announced values — keep them out of the a11y tree).

---

## 12. Suggested build order (each step independently demoable)

1. **Scaffold**: `android/` Gradle project, theme tokens (§4), Vehicle Select screen.
2. **Telemetry**: Firestore named-DB client, 500 ms upload loop, battery + location +
   heading sensors → vehicle appears live on the web console map.
3. **WebRTC video**: capturer + signaling contract (§8.2) → operator sees the stream.
4. **Command plane**: DataChannel + Firestore command mirror, seq dedupe, drive ingress
   UI, command overlays → remote drive works end-to-end.
5. **Safety**: graded failsafe watchdog + banners + MRM latch (§6.2).
6. **Mode 1**: propose-maneuver flow + verdict overlays (§8.4).
7. **Hardening**: foreground service, wake lock, ICE restart, permission flows (§9).

Definition of done for the milestone: a cross-network session (phone on cellular,
operator on the deployed web console) survives screen-off, completes a maneuver
confirm round-trip, and walks through all three failsafe stages when the operator
tab is killed.
