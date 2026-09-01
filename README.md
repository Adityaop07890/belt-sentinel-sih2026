# Belt-Sentinel 🚨

### AIoT Conveyor Belt Health Monitoring & Predictive Maintenance Platform

**SIH 2026 · Problem Statement 26008**

Belt-Sentinel is an AIoT-based predictive-maintenance platform designed to monitor industrial conveyor belts, detect early-stage failures, identify affected joints, estimate equipment health, and provide actionable maintenance recommendations.

The platform combines **vibration, temperature, motor-current and computer-vision signals** into a unified monitoring dashboard for industrial operators and maintenance teams.

> **Detect early. Localize accurately. Act before failure.**

---

## 🎯 Problem

Industrial conveyor belts are critical to mining and material-handling operations. Failures such as:

* Belt-joint degradation
* Splice damage
* Belt misalignment
* Motor overload
* Belt slipping
* Thermal abnormalities

can result in production downtime, equipment damage, safety risks and expensive emergency maintenance.

Traditional maintenance approaches often depend on periodic inspection or single-sensor thresholds, which can miss developing faults.

---

## 💡 Solution

Belt-Sentinel provides a centralized monitoring and predictive-maintenance workflow:

```text
Sensors
   ↓
Edge / AIoT Gateway
   ↓
Multimodal Condition Analysis
   ↓
Anomaly Detection
   ↓
Health + Confidence + Risk
   ↓
Joint-Level Diagnosis
   ↓
Alert & Maintenance Recommendation
   ↓
Operator Dashboard
```

The system is designed to move maintenance from **reactive repair** toward **condition-based and predictive maintenance**.

---

## 🔧 Sensor Architecture

The target hardware architecture uses multiple complementary sensing modalities:

| Sensor        | Purpose                                   |
| ------------- | ----------------------------------------- |
| **MPU6050**   | Vibration / motion monitoring             |
| **MLX90614**  | Non-contact temperature measurement       |
| **ACS712**    | Motor current monitoring                  |
| **ESP32-CAM** | Visual inspection of belt/joint condition |
| **ESP32**     | Edge sensing and gateway layer            |
| **MQTT**      | Telemetry communication                   |

Using multiple modalities reduces dependence on a single sensor and enables cross-validation of abnormal conditions.

---

## 🧠 Multimodal Monitoring

Belt-Sentinel evaluates multiple signals together:

```text
Vibration
   +
Temperature
   +
Motor Current
   +
Belt Speed
   +
Computer Vision
        ↓
Multimodal Condition Assessment
```

For example:

### Loose Joint

```text
Periodic vibration spikes
        +
Thermal increase
        +
Elevated anomaly score
        ↓
J2 Early Degradation
```

### Damaged Joint

```text
High vibration
        +
Large thermal rise
        +
Visual tear detection
        ↓
High-confidence critical condition
```

### Motor Overload / Belt Slipping

```text
Motor current ↑
Belt speed ↓
Vibration ↑
Temperature ↑
        ↓
Overload / slipping condition
```

---

## 📊 Health & Risk Model

The dashboard represents the equipment state using:

* **Health Score** — estimated condition of the belt/joint
* **Anomaly Score** — degree of abnormal behavior
* **Confidence Score** — agreement/quality across sensing modalities
* **Risk State** — operational severity
* **ISO vibration zone** — vibration severity classification

Current vibration classification in the prototype:

```text
< 1.8 mm/s       → Zone A
1.8–<2.8 mm/s    → Zone B
2.8–<4.5 mm/s    → Zone C
≥ 4.5 mm/s       → Zone D
```

---

## 🚨 Alert Workflow

When abnormal behavior is detected:

```text
Sensor Anomaly
      ↓
Severity Assessment
      ↓
Affected Component / Joint
      ↓
Alert Generation
      ↓
Evidence Display
      ↓
Maintenance Recommendation
```

A critical condition can provide:

```text
CRITICAL ALERT
Affected Joint: J2

Evidence:
• High vibration
• Thermal rise
• Visual damage
• High anomaly score

Recommended Action:
Halt / decelerate the belt
and inspect or replace the affected joint.
```

---

## 🤖 AI Maintenance Recommendations

Belt-Sentinel includes an LLM-powered maintenance recommendation layer.

The system sends the detected condition and supporting evidence to the AI model and generates structured guidance:

```text
1. Root Cause Hypothesis
2. Immediate Action
3. Follow-up Maintenance
4. Risk if Ignored
```

The recommendation is streamed to the dashboard so the operator can receive guidance without manually interpreting raw sensor values.

---

## 🪪 Joint Health Passport

Each conveyor joint can maintain a historical health record.

The Health Passport provides:

* Latest joint condition
* 90-day health trend
* Confidence history
* Risk state
* Recent anomalies
* Event history

This allows maintenance teams to answer:

> **"How has this joint been behaving over time?"**

instead of looking only at the current sensor reading.

---

## 🖥️ Dashboard

The React dashboard provides:

* Executive health overview
* Joint health matrix
* Computer-vision inspection panel
* Live telemetry charts
* Alert panel
* Historical trends
* Scenario controls
* User authentication
* Maintenance recommendations

The dashboard currently refreshes monitoring data every **1.5 seconds** to provide a live-monitoring experience.

---

## 🏗️ System Architecture

```text
                    ┌─────────────────────┐
                    │    Conveyor Belt    │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
      MPU6050               MLX90614             ACS712
     Vibration             Temperature          Motor Current
          │                    │                    │
          └────────────────────┼────────────────────┘
                               │
                               ▼
                         ESP32 / Edge
                               │
                         ESP32-CAM
                               │
                               ▼
                    Multimodal Analysis
                               │
                ┌──────────────┼──────────────┐
                ▼              ▼              ▼
             Health         Anomaly        Confidence
                │              │              │
                └──────────────┼──────────────┘
                               ▼
                          Risk Engine
                               │
                               ▼
                       FastAPI Backend
                         /          \
                        /            \
                       ▼              ▼
                  Supabase           LLM
                 Historical       Maintenance
                    Data         Recommendation
                       \              /
                        \            /
                         ▼          ▼
                         React Dashboard
                               │
                               ▼
                            Operator
```

---

## 📁 Repository Structure

```text
belt-sentinel-sih2026/
│
├── backend/
│   ├── server.py
│   ├── supabase_client.py
│   ├── synthetic_seed.py
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
│   │
│   ├── package.json
│   └── ...
│
├── tests/
├── test_reports/
├── test_result.md
└── README.md
```

### Important files

| File                                 | Purpose                                                          |
| ------------------------------------ | ---------------------------------------------------------------- |
| `backend/server.py`                  | FastAPI API, scenarios, telemetry, alerts and AI recommendations |
| `backend/synthetic_seed.py`          | Generates realistic historical telemetry                         |
| `backend/supabase_client.py`         | Supabase/PostgREST data access layer                             |
| `frontend/src/App.js`                | Application routing and authentication                           |
| `frontend/src/pages/Dashboard.jsx`   | Main monitoring dashboard                                        |
| `frontend/src/lib/api.js`            | Frontend API communication and LLM streaming                     |
| `frontend/src/auth/AuthProvider.jsx` | Authentication/session management                                |

---

## 🧪 Prototype Scenarios

The current prototype provides five operational scenarios:

```text
1. Normal Operation
2. Loose Joint
3. Damaged Joint
4. Belt Misalignment
5. Motor Overload / Belt Slipping
```

These allow the complete detection → diagnosis → alert → recommendation workflow to be demonstrated without physically creating dangerous equipment failures.

---

## 📚 Synthetic Historical Dataset

The prototype includes a synthetic historical-data generator designed to emulate realistic conveyor behavior.

It generates:

* **15,000 records**
* **75 days**
* **4 joints**
* Multiple failure episodes
* Correlated vibration, temperature, current, health and anomaly signals

The historical timeline models transitions such as:

```text
Stable
  ↓
Early Warning
  ↓
Degradation
  ↓
Critical Event
  ↓
Inspection / Recovery
```

This allows the dashboard's historical and predictive-maintenance features to be demonstrated consistently.

---

## 🛠️ Technology Stack

### Frontend

* React 19
* React Router
* Tailwind CSS
* Recharts
* Axios
* Supabase Auth
* Radix UI
* Lucide React
* Framer Motion

### Backend

* Python
* FastAPI
* Uvicorn
* Pydantic
* Async HTTP / PostgREST
* MongoDB support

### Data & AI

* Supabase
* Synthetic telemetry generator
* Claude-based maintenance recommendation layer

### Industrial / Edge

* ESP32
* MPU6050
* MLX90614
* ACS712
* ESP32-CAM
* MQTT

---

## 🚀 Running the Project

### 1. Clone the repository

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

---

## 🔐 Environment Variables

The project expects environment configuration for services such as:

```env
MONGO_URL=
DB_NAME=

SUPABASE_URL=
SUPABASE_ANON_KEY=

EMERGENT_LLM_KEY=

CORS_ORIGINS=
SEED_ADMIN_TOKEN=
```

**Never commit real API keys, passwords, service-role keys or secrets to GitHub.**

---

## 🔌 API Overview

### Monitoring

```http
GET /api/dashboard/snapshot
GET /api/dashboard/timeseries
GET /api/scenarios
```

### Historical Data

```http
GET /api/history/joint
GET /api/history/all-joints
GET /api/joint/passport
GET /api/sensors
```

### AI Recommendation

```http
POST /api/ai/recommendation
```

### Data Seeding

```http
POST /api/admin/seed
```

---

## 🧭 Current Prototype vs. Deployment

The current GitHub version uses **scenario-driven synthetic telemetry** for the live demonstration while also supporting persistent historical data through Supabase.

The intended production architecture replaces the simulator's telemetry source with real edge-device data:

```text
Current Prototype

Scenario Simulator
       ↓
FastAPI
       ↓
Dashboard
```

### Target Deployment

```text
Real Sensors
     ↓
ESP32 Edge Gateway
     ↓
MQTT
     ↓
Backend / ML Pipeline
     ↓
Multimodal Fusion
     ↓
Database + Dashboard
     ↓
Operator Alerts
```

This separation allows the UI and backend interfaces to be validated before hardware deployment.

---

## 🔮 Future Enhancements

Planned production enhancements include:

* Real-time ESP32 telemetry ingestion
* Trained anomaly-detection models
* Computer-vision crack/tear detection
* Automatic failure localization
* Remaining Useful Life (RUL) prediction
* SMS / WhatsApp / Email alerts
* Edge-side inference
* Role-based access control
* Automated incident acknowledgement
* Maintenance work-order integration
* Sensor calibration and health monitoring

---

## 🏆 SIH Value Proposition

Belt-Sentinel focuses on five key outcomes:

```text
EARLY DETECTION
      +
MULTI-SENSOR VALIDATION
      +
JOINT-LEVEL LOCALIZATION
      +
PREDICTIVE MAINTENANCE
      +
ACTIONABLE OPERATIONS
```

Instead of only displaying raw telemetry, the system converts industrial sensor data into an operator decision:

> **What is happening?
> Where is it happening?
> How serious is it?
> How confident are we?
> What should we do next?**

---

## 👥 Team

**Belt-Sentinel — SIH 2026**

Built as a prototype for **Smart India Hackathon 2026**.

---

## 📄 License

Add your preferred project license here, such as MIT, Apache-2.0, or an institution/team-specific license.

---

### Belt-Sentinel

**From sensor signals to maintenance decisions.**
