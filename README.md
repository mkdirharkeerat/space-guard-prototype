# Space-Guard (SIH 2026)

**Space-Guard** is an advanced orbital collision detection and avoidance planning system.

> **Note:** This repository contains the **Frontend Visualization Prototype** built for the Smart India Hackathon (SIH) 2026 presentation.

## Overview
This interactive WebGL walkthrough demonstrates the core capabilities of the Space-Guard platform:
1. **Live Telemetry Parsing**: Ingesting TLE data from CelesTrak.
2. **SGP4 Propagation**: Real-time orbital mechanics mapped in 3D.
3. **Collision Detection**: Historical replay of the 2009 Iridium-Cosmos collision.
4. **Maneuver Planning**: Real-time interactive calculation of Clohessy-Wiltshire (CW) avoidance burns.

## Tech Stack
- React 19 + Vite
- Three.js (WebGL rendering)
- TailwindCSS (Styling)
- Framer Motion (Animations)

## Running Locally
\`\`\`bash
npm install
npm run dev
\`\`\`

## Note to Evaluators
The physics computations, TLE propagation (sgp4), and Conjunction Data Message (CDM) generators live in our separate Python FastAPI backend repository. This React application serves as the presentation layer to visualize those capabilities interactively.
