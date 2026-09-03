# 🚨 Belt-Sentinel

### AIoT Conveyor Belt Health Monitoring & Predictive Maintenance

<p align="center">
  <strong>Detect early · Localize the problem · Act before failure</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/SIH%202026-PS%2026008-ff6b35?style=for-the-badge" alt="SIH 2026">
  <img src="https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=white" alt="React 19">
  <img src="https://img.shields.io/badge/FastAPI-Python-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/Supabase-Postgres-3ecf8e?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase">
</p>

> **Belt-Sentinel is a prototype monitoring system for industrial conveyor belts.** It combines simulated vibration, temperature, motor-current and vision signals to show how a maintenance team could move from periodic inspection toward condition-based maintenance.

---

## 👀 What does it actually do?

A conveyor problem rarely announces itself as one perfect sensor reading. Belt-Sentinel treats the problem as a combination of signals and turns them into something an operator can act on.

The dashboard can show:

- overall belt health
- joint-level condition for J1–J4
- vibration, temperature, current and speed trends
- anomaly and confidence scores
- vision-based damage evidence in the prototype
- alerts with maintenance actions
- historical joint behaviour
- scenario-based fault reproduction for demonstrations

The important part is the workflow:

```text
Signals
   ↓
Condition analysis
   ↓
Anomaly / health assessment
   ↓
Affected joint or system state
   ↓
Alert + evidence
   ↓
Maintenance action
```

---

## 🎯 Why this project?

Conveyor downtime can come from joint degradation, misalignment, slipping, overload or thermal problems. A threshold-only system can make it difficult to understand **where the issue is, how serious it is, and what evidence supports the alert**.

Belt-Sentinel is built around those questions:

| Operator question | Dashboard answer |
|---|---|
| **What is wrong?** | Health, anomaly and alert state |
| **Where is it?** | Joint-level condition |
| **How bad is it?** | Risk + severity indicators |
| **How sure are we?** | Confidence score + multimodal evidence |
| **What should we do?** | Maintenance recommendation |

---

## 🧩 Prototype architecture

```text
┌───────────────────────────────┐
│ Industrial Conveyor / Target  │
└───────────────┬───────────────┘
                │
     ┌──────────┼──────────┐
     │          │          │
     ▼          ▼          ▼
  Vibration  Thermal    Current      Vision
  MPU6050    MLX90614   ACS712      ESP32-CAM
     │          │          │            │
     └──────────┴──────────┴────────────┘
                     │
                     ▼
              Edge / Telemetry Layer
                     │
                     ▼
               FastAPI Backend
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
      Supabase   Scenario      AI
      History    Engine    Recommendation
          │          │          │
          └──────────┼──────────┘
                     ▼
              React Monitoring UI
                     │
                     ▼
                  Operator
```

### Hardware target

The intended edge setup uses ESP32 with MPU6050, MLX90614, ACS712 and ESP32-CAM. The current demo can run without physical hardware by switching between controlled fault scenarios.

---

## 🧪 Demo scenarios

The backend contains five repeatable operating modes, which makes the prototype easy to demonstrate during a hackathon without creating a real equipment fault:

| Scenario | Example signal pattern | Prototype outcome |
|---|---|---|
| 🟢 Normal | stable signals | healthy state |
| 🟡 Loose Joint | vibration + thermal rise | J2 warning |
| 🔴 Damaged Joint | high vibration + thermal rise + vision evidence | J2 critical alert |
| 🟠 Misalignment | distributed lateral vibration | system warning |
| 🔴 Motor Overload / Slipping | current rises while belt speed falls | critical overload alert |

The scenario engine is implemented directly in `backend/server.py`, including health, confidence, anomaly, joint state and alert values.

---

## 📈 Synthetic dataset

The prototype uses generated historical telemetry so the dashboard can demonstrate long-term trends before live industrial hardware is connected.

The dataset generator is deterministic and models:

- **15,000 rows**
- **75 days** of history
- **4 joints** (`J1`–`J4`)
- normal operation plus fault episodes
- correlated health, vibration, temperature, current, anomaly and confidence signals
- sensor degradation and modality-disagreement cases

The timeline intentionally includes a progression such as:

```text
Stable
  ↓
Early warning
  ↓
Degradation
  ↓
Critical event
  ↓
Inspection / recovery
```

The seed script documents the 15,000-row / 75-day design and generates the episodes across the four joints.

### Important note

This dataset is **synthetic prototype data**. It is useful for testing the application, visualising trends and demonstrating the detection workflow; it should not be presented as field-collected sensor data.

---

## 🧠 Health, anomaly and confidence

The dashboard exposes several signals instead of hiding everything behind one number.

**Health score** — a compact view of the estimated condition.

**Anomaly score** — how far the observed behaviour is from the expected operating pattern.

**Confidence score** — how strongly the available modalities support the displayed condition.

**Risk state** — the operational urgency attached to the current condition.

For vibration, the prototype also displays ISO-style severity zones using the thresholds implemented by the project.

---

## 🤖 AI-assisted maintenance recommendation

When the system identifies a significant condition, the backend can pass the detected state and supporting evidence into the recommendation layer. The goal is not to replace a maintenance engineer; it is to turn telemetry into a readable next step.

Typical output is structured around:

```text
Root-cause hypothesis
        ↓
Immediate action
        ↓
Follow-up maintenance
        ↓
Risk of ignoring the issue
```

The backend describes this as an LLM-generated maintenance recommendation layer and exposes a streaming recommendation path.

---

## 🖥️ Dashboard

The frontend is a React application with a monitoring-console layout. The main dashboard includes the executive health banner, joint matrix, vision panel, telemetry charts, alert panel and historical trend view.

The dashboard polls the backend every **1.5 seconds** for a live-demo experience.

### Main views

**Joint Matrix**  
See the condition of each belt joint at a glance.

**Vision Panel**  
Show prototype vision evidence when a damaged-joint scenario is selected.

**Telemetry Charts**  
Follow vibration, temperature, current and other operating signals over time.

**Alert Panel**  
Connect an abnormal state to evidence and a recommended action.

**Historical Trend**  
Use stored history to understand how a joint has changed rather than looking only at the latest sample.

---

## 🗄️ Supabase data layer

The project uses Supabase through its PostgREST interface rather than relying on the Supabase Python SDK. The custom async client supports table reads, inserts, counts, filtering, ordering and pagination.

That gives the prototype a clean separation:

```text
Frontend
   ↓
FastAPI API
   ↓
Supabase / PostgREST
   ↓
Historical telemetry
```

The backend also contains optional MongoDB persistence for scenario runs, so MongoDB and Supabase have different roles rather than being presented as the same data layer.

---

## 🛠️ Tech stack

### Frontend

- React 19
- React Router
- Tailwind CSS
- Recharts
- Axios
- Supabase Auth
- Radix UI
- Framer Motion
- Lucide React

### Backend

- Python
- FastAPI
- Uvicorn
- Pydantic
- httpx
- MongoDB client
- Supabase PostgREST client

### Edge / industrial target

- ESP32
- MPU6050
- MLX90614
- ACS712
- ESP32-CAM
- MQTT

---

## 📁 Repository structure

```text
belt-sentinel-sih2026/
│
├── backend/
│   ├── server.py                 # API + scenarios + alerts + recommendations
│   ├── synthetic_seed.py         # historical telemetry generator
│   ├── supabase_client.py        # async Supabase/PostgREST access
│   ├── requirements.txt
│   └── tests/
│
├── frontend/
│   ├── src/
│   │   ├── auth/
│   │   ├── components/
│   │   ├── constants/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── pages/
│   ├── package.json
│   └── ...
│
├── tests/
├── test_reports/
├── test_result.md
└── README.md
```

A few files worth opening first:

| File | Why it matters |
|---|---|
| `backend/server.py` | Scenario logic, API endpoints, alerts and recommendation flow |
| `backend/synthetic_seed.py` | How the historical dataset is generated |
| `backend/supabase_client.py` | Database access through PostgREST |
| `frontend/src/pages/Dashboard.jsx` | Main monitoring screen |
| `frontend/src/lib/api.js` | Frontend ↔ backend communication |
| `frontend/src/auth/AuthProvider.jsx` | Login/session handling |

---

## 🚀 Run locally

### 1. Clone

```bash
git clone https://github.com/Adityaop07890/belt-sentinel-sih2026.git
cd belt-sentinel-sih2026
```

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload
```

### 3. Frontend

```bash
cd frontend
yarn install
yarn start
```

The frontend is configured with Yarn and uses `craco start` under the hood.

---

## 🔐 Environment variables

Create the required environment file(s) locally and keep secrets out of Git history.

```env
MONGO_URL=
DB_NAME=
SUPABASE_URL=
SUPABASE_ANON_KEY=
EMERGENT_LLM_KEY=
CORS_ORIGINS=
SEED_ADMIN_TOKEN=
```

Never commit passwords, private API keys, service-role keys or other credentials.

---

## 🔌 API surface

Typical monitoring endpoints include:

```http
GET /api/dashboard/snapshot
GET /api/dashboard/timeseries
GET /api/scenarios
GET /api/history/joint
GET /api/history/all-joints
GET /api/joint/passport
GET /api/sensors
POST /api/ai/recommendation
POST /api/admin/seed
```

Treat these as the project-facing API surface; endpoint details can evolve with the prototype.

---

## 🔄 Prototype today → deployment tomorrow

One of the important design choices is keeping the **data source** separate from the dashboard workflow.

### Today: hackathon prototype

```text
Scenario generator
       ↓
FastAPI
       ↓
Supabase / application state
       ↓
React dashboard
```

### Production direction

```text
Real sensors
    ↓
ESP32 edge node
    ↓
MQTT / telemetry transport
    ↓
Validated ML + multimodal pipeline
    ↓
Database + alerting
    ↓
Operator dashboard
```

That lets the team prove the application workflow first, then replace the simulator with live hardware data.

---

## 🧭 What is implemented vs. future work?

### In the current prototype

- scenario-driven telemetry
- joint-level health state
- anomaly and confidence values
- historical synthetic data
- Supabase data access
- authentication in the dashboard
- alert presentation
- prototype vision evidence
- AI-assisted maintenance recommendations

### Natural next steps

- real ESP32 telemetry ingestion
- field-calibrated sensor baselines
- trained anomaly-detection models
- production-grade computer vision
- remaining useful life (RUL) estimation
- SMS / WhatsApp / email notifications
- edge inference
- role-based access control
- maintenance work-order integration

The distinction matters: these future items should not be confused with features already validated on a real conveyor.

---

## 🏆 Why the prototype is useful for SIH

Belt-Sentinel is not trying to be only another sensor dashboard. The demo is structured around the decision a maintenance team actually needs to make:

> **What changed? Where did it happen? How serious is it? How confident are we? What should we do next?**

That is the product idea in one line:

**sensor signals → diagnosis → evidence → maintenance decision**

---

## 📌 Project status

**Stage:** Hackathon prototype  
**Event:** Smart India Hackathon 2026  
**Problem Statement:** PS 26008  
**Data:** Synthetic + application-managed prototype data  
**Target domain:** Industrial conveyor belt monitoring

---

## 👥 Team

**Belt-Sentinel — SIH 2026**

Built for the Smart India Hackathon 2026 prototype track.

---

## 📄 License

Add your team's chosen license here (for example, MIT or Apache-2.0) before public release.

---

<p align="center">
  <sub>Built around a simple idea: catch the change before the failure.</sub>
</p>
