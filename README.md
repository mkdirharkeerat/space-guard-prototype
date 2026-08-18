# Space-Guard (SIH 2026)

**Space-Guard** is an advanced orbital collision detection and avoidance planning system.

This repository is a cohesive standalone project containing **both** the interactive WebGL frontend prototype and the Python FastAPI / SGP4 physics backend.

## Overview
This platform demonstrates the core capabilities of Space-Guard:
1. **Live Telemetry Parsing**: Ingesting TLE data from CelesTrak.
2. **SGP4 Propagation**: Real-time orbital mechanics mapped in 3D.
3. **Collision Detection**: Historical replay of the 2009 Iridium-Cosmos collision.
4. **Maneuver Planning**: Real-time interactive calculation of Clohessy-Wiltshire (CW) avoidance burns.

## Tech Stack
- **Frontend**: React 19, Vite, Three.js (WebGL), TailwindCSS, Framer Motion
- **Backend**: Python 3, FastAPI, sgp4, numpy, scikit-learn

## Running Locally

### 1. Start the Backend
Open a terminal and run the FastAPI server:
\`\`\`bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.api.main:app --reload --port 8000
\`\`\`

### 2. Start the Frontend
Open a new terminal and run the React app:
\`\`\`bash
npm install
npm run dev
\`\`\`

The frontend will start at `http://localhost:5174` and automatically proxy API requests to the backend.

## Note on Data
The backend caches CelesTrak TLE data locally. If you run this offline or deploy it to a static host without the backend, the frontend will automatically detect the missing API and fall back to synthetically generated telemetry to keep the demonstration running.
