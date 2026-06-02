<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Jöppilot: Smart Municipal Fleet Management Portal

Jöppilot is a premium, real-time autonomous fleet management and teleoperation portal designed for municipal smart-waste electric utility vehicles (Jöppli) in Switzerland. It supports multi-city workspace segregation (Zürich ERZ and Glarus), real-time WebRTC teleoperation, and automated safety overrides.

🔗 **AI Studio App**: [ai.studio/apps/f9949ca3-3243-426c-999c-8d254d4c9b73](https://ai.studio/apps/f9949ca3-3243-426c-999c-8d254d4c9b73)  
🔗 **Production Live Portal**: [joppilot.vercel.app](https://joppilot.vercel.app/)

---

## 🚀 Key Features

### 🇨🇭 1. Multi-City Workspace Segregation
* **Municipal Sandboxing**: Dynamic toggle between the **Zürich (ERZ)** and **Glarus** workspace cities. Admins can swap cities live to change vehicle registries, collection requests, and logs, while standard operators are strictly locked to their assigned city.
* **Canton Flag Branding**: Interactive coats of arms flags for Canton Zürich and Glarus are rendered as clean, custom inline SVGs on the login selection screen and sidebar header.

### 🎮 2. WebRTC Teleoperation & HUD Cockpit
* **Direct WebRTC Streaming**: Streams ultra-low-latency real-time video feed directly from vehicle camera modules.
* **Dynamic HUD Overlays**: Features a fighter-cockpit style heads-up display overlay on the video feed:
  * **Steering Reticle**: Rotating indicator showing active front-wheel steering angles (`-45°` to `45°`).
  * **Scrolling Compass Tape**: A rolling compass ribbon indicating the vehicle's cardinal heading.
  * **Progressive Power & Brake Indicators**: Vertical gauge bars displaying active throttle and brake force.
  * **RTT Connection Quality Gauge**: 5-bar cell reception status matching actual ping latency.
* **Dual input driving model**: Seamless support for both WASD/Arrow keyboards and analog Gamepad triggers, utilizing a unit-tested control integration loop.

### 🛡️ 3. ODD Geofence Enforcement & Safety Halts
* **Active Boundary Protection**: Continuously validates coordinates against the project's **Operating Design Domain (ODD)** geofences (defined in [places.ts](src/config/places.ts)).
* **Auto-Estop System**: If a vehicle is driven or routed outside boundary limits, the portal force-halts the vehicle (writing `avState: 'MRM'` [Minimal Risk Maneuver] and zeroing throttle in Firestore), triggers a critical alarm in the dispatch center, and locks controls.

### 🔒 4. Operator Provisioning & Approval Queue
* **Role Gating**: Multi-operator control claiming checks prevent two users from teleoperating the same vehicle. Includes control request-and-handback mechanics.
* **Admin Approval console**: New registrants enter a `'pending'` state, locking them out of the portal until approved by their respective city administrator via the **Contacts & Users** queue.
* **Trigger Email Integration**: Enqueues email request logs directly to the Firestore `mail` collection to work out-of-the-box with Firebase's **Trigger Email** extension to dispatch rich HTML emails notifying admins of pending registrations.

---

## 🛠️ Technology Stack
* **Frontend**: React (v19), TypeScript, Tailwind CSS (v4), Lucide React, Recharts
* **Maps & Routing**: Leaflet & React-Leaflet, OpenStreetMap Carto tiles, Open Source Routing Machine (OSRM)
* **Real-time Synchronization**: Firebase Auth, Firestore
* **P2P Video Streaming**: WebRTC Connection API, Google STUN / Custom TURN iceServers
* **Backend**: Express server, Node CJS bundling via ESBuild
* **Testing**: Vitest (18 passed unit tests covering steering logic, auth routing, and database security rules)

---

## 💻 Run Locally

### Prerequisites
* **Node.js** (v18+)
* **NPM**

### Setup Instructions

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   * Create a `.env` file in the root directory.
   * Add your Gemini API key:
     ```env
     GEMINI_API_KEY=your_gemini_api_key_here
     ```

3. **Fire Up the Application**:
   * Start the Vite development server and Express CJS API routes:
     ```bash
     npm run dev
     ```
   * Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing Suites

* **General Unit Tests**: Covers steer/throttle clamp, deadman watchdogs, and profile mappings:
  ```bash
  npm run test
  ```

* **Firestore Security Rules Emulator Tests**: Runs rules unit tests via the local Firestore emulator (Requires Java installed on system):
  ```bash
  npm run test:rules
  ```

---

## 📦 Deployment

### Firebase Hosting Deployment
The project includes static build configurations for deploying to Firebase Hosting:
```bash
# Build production bundle
npm run build

# Deploy only static assets to Firebase Hosting
firebase deploy --only hosting --config firebase.hosting.json --project gen-lang-client-0975513028
```
*(Deploying to Firebase Hosting automatically authorizes the `*.web.app` domain for Google Sign-in).*