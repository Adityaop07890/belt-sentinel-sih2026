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

## Iteration 2 — Supabase Data Layer + Auth (Feb 2026)
- Supabase PostgREST integration (`backend/supabase_client.py`) — anon-key REST only, no service_role exposed. Added pagination that walks past PostgREST's 1000-row cap via HTTP offset paging.
- Idempotent synthetic seed (`backend/synthetic_seed.py`) — 15,000 conveyor_telemetry rows + 7,500 joint_history rows + 5 sensor_status rows over 75 days across J1-J4 and all 5 scenarios. Correlated multimodal signals, sensor-degradation events, modality-disagreement events, realistic episode timeline.
- New endpoints: `/api/history/joint`, `/api/history/all-joints`, `/api/joint/passport`, `/api/sensors`, `/api/admin/seed` (gated by SEED_ADMIN_TOKEN when set).
- Server-side ceil-stride downsampling ensures 30D≤200, 60D/90D≤300, passport≤400 chart points, all terminating at the true latest timestamp.
- Sidebar sensor-diagnostics widget now reads live from `sensor_status`.
- New HistoricalTrend component below the dashboard grid — 30/60/90 day toggle, 4-joint health lines, drawn from `joint_history`.
- Supabase Auth (email/password) via `@supabase/supabase-js`; `AuthProvider`, `Login`, `Signup`, `ProtectedRoute`.
- `/dashboard` is now the protected primary route; unauthenticated visits redirect to `/login`.
- User badge + LOGOUT button in TopBar; session persists across refreshes.

## Backlog / Next
- P0: Complete auth login test — user must turn OFF "Confirm email" in Supabase (or manually confirm one user via SQL). See `memory/test_credentials.md`.
- P1: Joint Passport modal on joint-card click (drill-down 90-day chart + recent anomaly list, already available via `/api/joint/passport`)
- P1: Prediction Confidence % readout separate from Health Score in ExecutiveBanner
- P1: Conveyor visual map (schematic showing J1-J4 positions with live health)
- P2: FFT frequency-spectrum tab for vibration
- P2: Twilio SMS on critical alerts (waiting on user credentials)
- P2: PLC/SCADA/MQTT live-broker mode
- P2: Real backend JWT verification on `/api/*` endpoints (currently public, dashboard is protected on frontend only)

## Backlog / Next
- P1: FFT frequency-spectrum tab for vibration
- P1: Joint drill-down modal with 30-90 day lifecycle history
- P2: SMS alert via Twilio on critical (needs credentials from user)
- P2: Email alert integration
- P2: PLC/SCADA/MQTT live-broker mode (currently mock-only)
- P2: Historical alert log persisted in Mongo
