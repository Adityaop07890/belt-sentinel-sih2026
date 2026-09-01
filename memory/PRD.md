# AIoT Conveyor Belt Health & Joint Failure Prediction — Dashboard

## Original Problem Statement
> Work on the project dashboard. Decide what information should be displayed on the dashboard. Plan the UI, important parameters, alerts, graphs, predictions, etc. Make the dashboard suitable for demonstrating our model during the Internal Hackathon.
> Reference: https://aiot-conveyor-belt-monitoring-4sd29pqbe5tubgeepxwvcx.streamlit.app/

## Product Context
Smart India Hackathon 2026, PS-26008. An AIoT-based predictive maintenance system for
conveyor belt splice failures in iron-ore mining. Sensors: MPU6050 (vibration), MLX90614
(thermal), ACS712 (motor current), IR encoder (speed), ESP32-CAM (vision). AI: Isolation
Forest (sensor anomaly) + CNN (visual). Output: Belt Health Score (0-100) + joint-level
status (J1-J4) with explainable diagnostics.

## User Personas
- **Control-room operator** — needs at-a-glance health, immediate alerts, actionable recs.
- **Maintenance engineer** — needs drill-down telemetry, XAI reasoning, lifecycle prediction.
- **Hackathon jury** — needs to see the model react in real time across scenarios.

## Core Requirements
1. Scenario-driven live demo (Normal / Loose / Damaged / Misalignment / Overload)
2. ISA-101 dark HMI aesthetic (grayscale baseline, amber/red only for anomalies)
3. Global Belt Health Score gauge + 30-day trend
4. Executive banner: speed, current, vibration RMS (with ISO 10816-3 zones), ΔT, RPM, anomaly score, active alert marquee
5. Splice Joint Matrix (J1-J4) with health %, lifecycle, anomaly note, thumbnail, red border on critical
6. ESP32-CAM vision panel with CNN bounding box + confidence overlay on Damaged scenario
7. Tabbed telemetry charts: Vibration (ISO zones background), Thermal ΔT, Motor+Speed dual-axis, Anomaly Score
8. Explainable-AI alert cards (expandable) with multimodal evidence + system rec
9. LLM-generated maintenance recommendation (Claude Sonnet 4.6 via Emergent Universal LLM key, SSE streaming)

## Implemented (Feb 2026)
- Backend `server.py` with scenario simulator, snapshot + timeseries endpoints, streaming `/api/ai/recommendation`.
- Frontend dashboard: Sidebar, ExecutiveBanner, HealthGauge (SVG), JointMatrix, VisionPanel, TelemetryCharts, AlertPanel.
- Live polling every 1.5s, keyboard hotkeys 1-5 to switch scenarios.
- Fonts: IBM Plex Sans + JetBrains Mono. CRT scanlines + grain overlay for authentic HMI feel.

## Backlog / Next
- P1: FFT frequency-spectrum tab for vibration
- P1: Joint drill-down modal with 30-90 day lifecycle history
- P2: SMS alert via Twilio on critical (needs credentials from user)
- P2: Email alert integration
- P2: PLC/SCADA/MQTT live-broker mode (currently mock-only)
- P2: Historical alert log persisted in Mongo
