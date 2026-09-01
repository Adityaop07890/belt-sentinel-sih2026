"""AIoT Conveyor Belt Health Dashboard - Backend Simulator
Provides scenario-driven sensor telemetry, joint state, health score, and LLM-generated
maintenance recommendations (Claude Sonnet 4.6 via Emergent Universal LLM key).
"""
from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import math
import time
import random
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, timezone
import supabase_client as sb

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB (used for optional persistence of scenario runs)
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="AIoT Conveyor Belt Dashboard API")
api_router = APIRouter(prefix="/api")

# ---------------------------------------------------------------------------
# Scenario definitions
# ---------------------------------------------------------------------------

SCENARIOS: Dict[str, Dict[str, Any]] = {
    "normal": {
        "label": "Normal Operation",
        "health_score": 94,
        "belt_speed": 2.4,            # m/s
        "motor_current": 18.2,        # A
        "motor_rpm": 1460,
        "vibration_rms": 1.6,         # mm/s (ISO Zone A/B boundary at 1.8)
        "thermal_delta": 2.4,         # °C above ambient
        "anomaly_score": 0.10,
        "joint_states": {
            "J1": {"health": 96, "status": "healthy", "lifecycle_months": 14, "anomaly": None},
            "J2": {"health": 93, "status": "healthy", "lifecycle_months": 12, "anomaly": None},
            "J3": {"health": 95, "status": "healthy", "lifecycle_months": 15, "anomaly": None},
            "J4": {"health": 92, "status": "healthy", "lifecycle_months": 11, "anomaly": None},
        },
        "critical_joint": None,
        "alerts": [],
        "cnn_detection": None,
    },
    "loose_joint": {
        "label": "Loose Joint (J2)",
        "health_score": 72,
        "belt_speed": 2.4,
        "motor_current": 19.1,
        "motor_rpm": 1455,
        "vibration_rms": 3.1,
        "thermal_delta": 4.6,
        "anomaly_score": 0.42,
        "joint_states": {
            "J1": {"health": 94, "status": "healthy", "lifecycle_months": 13, "anomaly": None},
            "J2": {"health": 71, "status": "warning", "lifecycle_months": 4,
                   "anomaly": "Micro-vibration spikes synchronized with pulley transit"},
            "J3": {"health": 92, "status": "healthy", "lifecycle_months": 14, "anomaly": None},
            "J4": {"health": 90, "status": "healthy", "lifecycle_months": 10, "anomaly": None},
        },
        "critical_joint": "J2",
        "alerts": [
            {
                "id": "alrt-loose-j2",
                "severity": "warning",
                "title": "Joint J2: Early Degradation Detected",
                "summary": "Periodic vibration spikes detected during J2 pulley transit.",
                "recommendation": "Schedule inspection of J2 splice within 72 hours.",
                "evidence": {
                    "vibration": {"value": 3.1, "unit": "mm/s", "baseline": 1.6, "delta": "+94%"},
                    "thermal":   {"value": 4.6, "unit": "°C ΔT", "baseline": 2.4, "delta": "+92%"},
                    "vision":    {"status": "nominal", "confidence": None},
                    "anomaly_score": 0.42,
                },
            }
        ],
        "cnn_detection": None,
    },
    "damaged_joint": {
        "label": "Damaged Joint (J2 – Critical)",
        "health_score": 34,
        "belt_speed": 2.1,
        "motor_current": 22.6,
        "motor_rpm": 1440,
        "vibration_rms": 5.8,
        "thermal_delta": 15.2,
        "anomaly_score": 0.87,
        "joint_states": {
            "J1": {"health": 91, "status": "healthy", "lifecycle_months": 12, "anomaly": None},
            "J2": {"health": 28, "status": "critical", "lifecycle_months": 0,
                   "anomaly": "Transverse fiber separation confirmed by CNN vision"},
            "J3": {"health": 89, "status": "healthy", "lifecycle_months": 13, "anomaly": None},
            "J4": {"health": 87, "status": "healthy", "lifecycle_months": 9, "anomaly": None},
        },
        "critical_joint": "J2",
        "alerts": [
            {
                "id": "alrt-damaged-j2",
                "severity": "critical",
                "title": "CRITICAL: Joint J2 Rapid Degradation",
                "summary": "Multi-modal fusion confirms splice separation. Immediate halt advised.",
                "recommendation": "Initiate automated belt deceleration and halt for J2 replacement.",
                "evidence": {
                    "vibration": {"value": 5.8, "unit": "mm/s", "baseline": 1.6, "delta": "ISO Zone D"},
                    "thermal":   {"value": 15.2, "unit": "°C ΔT", "baseline": 2.4, "delta": "+533%"},
                    "vision":    {"status": "tear_detected", "confidence": 0.92,
                                  "bbox": {"x": 0.28, "y": 0.34, "w": 0.44, "h": 0.28}},
                    "anomaly_score": 0.87,
                },
            }
        ],
        "cnn_detection": {"joint": "J2", "confidence": 0.92,
                          "bbox": {"x": 0.28, "y": 0.34, "w": 0.44, "h": 0.28},
                          "label": "Transverse tear"},
    },
    "misalignment": {
        "label": "Belt Misalignment",
        "health_score": 61,
        "belt_speed": 2.3,
        "motor_current": 20.4,
        "motor_rpm": 1450,
        "vibration_rms": 2.8,
        "thermal_delta": 6.8,
        "anomaly_score": 0.55,
        "joint_states": {
            "J1": {"health": 78, "status": "warning", "lifecycle_months": 6,
                   "anomaly": "Constant lateral vibration profile"},
            "J2": {"health": 76, "status": "warning", "lifecycle_months": 6,
                   "anomaly": "Constant lateral vibration profile"},
            "J3": {"health": 79, "status": "warning", "lifecycle_months": 7,
                   "anomaly": "Constant lateral vibration profile"},
            "J4": {"health": 74, "status": "warning", "lifecycle_months": 5,
                   "anomaly": "Constant lateral vibration profile"},
        },
        "critical_joint": None,
        "alerts": [
            {
                "id": "alrt-misalign",
                "severity": "warning",
                "title": "Belt Misalignment Warning",
                "summary": "Constant lateral vibration across all joints with gradual thermal rise.",
                "recommendation": "Halt at next cycle and re-tension idler rollers.",
                "evidence": {
                    "vibration": {"value": 2.8, "unit": "mm/s (lateral)", "baseline": 1.6, "delta": "+75%"},
                    "thermal":   {"value": 6.8, "unit": "°C ΔT (distributed)", "baseline": 2.4, "delta": "+183%"},
                    "vision":    {"status": "nominal", "confidence": None},
                    "anomaly_score": 0.55,
                },
            }
        ],
        "cnn_detection": None,
    },
    "overload": {
        "label": "Motor Overload / Belt Slipping",
        "health_score": 48,
        "belt_speed": 1.4,
        "motor_current": 31.8,
        "motor_rpm": 1490,
        "vibration_rms": 4.2,
        "thermal_delta": 10.1,
        "anomaly_score": 0.74,
        "joint_states": {
            "J1": {"health": 82, "status": "warning", "lifecycle_months": 9, "anomaly": "Slip-induced friction"},
            "J2": {"health": 80, "status": "warning", "lifecycle_months": 8, "anomaly": "Slip-induced friction"},
            "J3": {"health": 78, "status": "warning", "lifecycle_months": 8, "anomaly": "Slip-induced friction"},
            "J4": {"health": 77, "status": "warning", "lifecycle_months": 7, "anomaly": "Slip-induced friction"},
        },
        "critical_joint": None,
        "alerts": [
            {
                "id": "alrt-overload",
                "severity": "critical",
                "title": "CRITICAL: Belt Slipping / Motor Overload",
                "summary": "Motor current draws exceed nominal while belt speed drops – slipping condition.",
                "recommendation": "Reduce feed rate immediately; inspect drive pulley coupling.",
                "evidence": {
                    "vibration": {"value": 4.2, "unit": "mm/s", "baseline": 1.6, "delta": "ISO Zone C"},
                    "thermal":   {"value": 10.1, "unit": "°C ΔT", "baseline": 2.4, "delta": "+320%"},
                    "vision":    {"status": "nominal", "confidence": None},
                    "anomaly_score": 0.74,
                },
            }
        ],
        "cnn_detection": None,
    },
}


# ---------------------------------------------------------------------------
# Simulator
# ---------------------------------------------------------------------------

def _noise(base: float, pct: float = 0.03) -> float:
    return base * (1 + random.uniform(-pct, pct))

def _series(base: float, points: int, jitter_pct: float, spike_period: Optional[int] = None,
            spike_mag: float = 0.0) -> List[float]:
    now = time.time()
    out = []
    for i in range(points):
        v = base * (1 + random.uniform(-jitter_pct, jitter_pct))
        # add smooth breathing sine
        v += base * 0.04 * math.sin((now + i * 0.5))
        if spike_period and (i % spike_period == 0) and i > 0:
            v += spike_mag
        out.append(round(v, 3))
    return out

def generate_snapshot(scenario_key: str) -> Dict[str, Any]:
    if scenario_key not in SCENARIOS:
        raise HTTPException(400, f"Unknown scenario: {scenario_key}")
    sc = SCENARIOS[scenario_key]
    now_iso = datetime.now(timezone.utc).isoformat()

    # Live top-line values (small jitter)
    live = {
        "health_score": round(_noise(sc["health_score"], 0.01), 1),
        "belt_speed":   round(_noise(sc["belt_speed"], 0.02), 3),
        "motor_current": round(_noise(sc["motor_current"], 0.03), 2),
        "motor_rpm":    int(_noise(sc["motor_rpm"], 0.005)),
        "vibration_rms": round(_noise(sc["vibration_rms"], 0.05), 3),
        "thermal_delta": round(_noise(sc["thermal_delta"], 0.05), 2),
        "anomaly_score": round(min(1.0, max(0.0, sc["anomaly_score"] + random.uniform(-0.03, 0.03))), 3),
    }

    # ISO 10816-3 severity band
    v = live["vibration_rms"]
    if v < 1.8:
        iso_zone = "A"
    elif v < 2.8:
        iso_zone = "B"
    elif v < 4.5:
        iso_zone = "C"
    else:
        iso_zone = "D"

    return {
        "scenario": scenario_key,
        "scenario_label": sc["label"],
        "timestamp": now_iso,
        "live": live,
        "iso_zone": iso_zone,
        "joints": sc["joint_states"],
        "critical_joint": sc["critical_joint"],
        "alerts": sc["alerts"],
        "cnn_detection": sc["cnn_detection"],
        "system": {
            "edge_node": "online",
            "mqtt_broker": "connected",
            "sd_buffer_pct": round(random.uniform(6, 12), 1),
            "sync_pct": 100,
        },
    }


def generate_timeseries(scenario_key: str, points: int = 60) -> Dict[str, List[float]]:
    """Returns synthetic timeseries per sensor for the last `points` samples (~1 Hz)."""
    if scenario_key not in SCENARIOS:
        raise HTTPException(400, f"Unknown scenario: {scenario_key}")
    sc = SCENARIOS[scenario_key]

    spike_period, spike_mag = None, 0.0
    if scenario_key == "loose_joint":
        spike_period, spike_mag = 10, 1.5
    elif scenario_key == "damaged_joint":
        spike_period, spike_mag = 6, 3.0

    vib = _series(sc["vibration_rms"], points, 0.05, spike_period, spike_mag)
    thermal = _series(sc["thermal_delta"], points, 0.04)
    current = _series(sc["motor_current"], points, 0.03,
                      spike_period=5 if scenario_key == "overload" else None,
                      spike_mag=4.0 if scenario_key == "overload" else 0.0)
    speed = _series(sc["belt_speed"], points, 0.02,
                    spike_period=4 if scenario_key == "overload" else None,
                    spike_mag=-0.6 if scenario_key == "overload" else 0.0)
    anomaly = [round(min(1.0, max(0.0, sc["anomaly_score"] + random.uniform(-0.05, 0.05))), 3)
               for _ in range(points)]

    # 30-day health trend (deterministic downward if not healthy)
    base_h = sc["health_score"]
    if scenario_key == "normal":
        trend = [round(base_h + random.uniform(-2, 2), 1) for _ in range(30)]
    else:
        trend = [round(min(99, base_h + (30 - i) * 1.5 + random.uniform(-3, 3)), 1)
                 for i in range(30)]

    # timestamps (relative seconds ago for x-axis labels)
    now = time.time()
    stamps = [int((now - (points - 1 - i))) for i in range(points)]

    return {
        "t": stamps,
        "vibration": vib,
        "thermal": thermal,
        "motor_current": current,
        "belt_speed": speed,
        "anomaly_score": anomaly,
        "health_30d": trend,
    }


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@api_router.get("/")
async def root():
    return {"service": "aiot-conveyor-dashboard", "status": "ok"}


@api_router.get("/scenarios")
async def list_scenarios():
    return [{"key": k, "label": v["label"]} for k, v in SCENARIOS.items()]


@api_router.get("/dashboard/snapshot")
async def snapshot(scenario: str = "normal"):
    return generate_snapshot(scenario)


@api_router.get("/dashboard/timeseries")
async def timeseries(scenario: str = "normal", points: int = 60):
    return generate_timeseries(scenario, points)


class RecommendationRequest(BaseModel):
    scenario: str
    alert_id: Optional[str] = None


@api_router.post("/ai/recommendation")
async def ai_recommendation(req: RecommendationRequest):
    """Stream a Claude-Sonnet-4.6 maintenance recommendation for the given scenario/alert."""
    if req.scenario not in SCENARIOS:
        raise HTTPException(400, f"Unknown scenario: {req.scenario}")
    sc = SCENARIOS[req.scenario]
    alert = None
    if sc["alerts"]:
        alert = next((a for a in sc["alerts"] if a["id"] == req.alert_id), sc["alerts"][0])

    if alert is None:
        # No alert to reason about – return a nominal message
        async def nominal():
            yield "data: All splice joints operating within nominal thresholds. No maintenance action required.\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(nominal(), media_type="text/event-stream",
                                 headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(500, "EMERGENT_LLM_KEY not configured")

    from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

    system_msg = (
        "You are a senior industrial reliability engineer specialising in conveyor belt "
        "predictive maintenance for iron-ore mining sites. You interpret multimodal sensor "
        "anomalies (MPU6050 vibration RMS, MLX90614 thermal delta, ACS712 motor current, "
        "ESP32-CAM CNN visual inspection) and issue crisp, actionable maintenance guidance "
        "aligned with ISO 10816-3 severity zones and ISA-101 alarm philosophy."
    )
    user_prompt = (
        f"Scenario: {sc['label']}\n"
        f"Alert: {alert['title']}\n"
        f"Severity: {alert['severity'].upper()}\n"
        f"Summary: {alert['summary']}\n"
        f"Evidence: {alert['evidence']}\n"
        f"Global belt health score: {sc['health_score']}/100\n\n"
        "Produce a maintenance recommendation in 4 short sections, using plain text (no markdown symbols):\n"
        "1. Root Cause Hypothesis (1–2 sentences)\n"
        "2. Immediate Action (bullet list of 2–3 concrete steps for the operator)\n"
        "3. Follow-up Maintenance (bullet list of 2–3 steps for the maintenance crew, with SLA hours)\n"
        "4. Risk if Ignored (1 sentence, quantify likely failure window)\n"
        "Keep total length under 180 words. Do not use asterisks or hash symbols."
    )

    chat = LlmChat(
        api_key=api_key,
        session_id=f"conveyor-{req.scenario}-{alert['id']}",
        system_message=system_msg,
    ).with_model("anthropic", "claude-sonnet-4-6")

    async def event_generator():
        try:
            async for event in chat.stream_message(UserMessage(text=user_prompt)):
                if isinstance(event, TextDelta):
                    # SSE requires 'data:' prefix; escape newlines inside payload
                    payload = event.content.replace("\n", "\\n")
                    yield f"data: {payload}\n\n"
                elif isinstance(event, StreamDone):
                    break
            yield "data: [DONE]\n\n"
        except Exception as e:  # pragma: no cover
            logger.exception("LLM stream failed")
            yield f"data: [ERROR] {str(e)}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ---------------------------------------------------------------------------
# Supabase-backed endpoints (historical + sensor + passport)
# ---------------------------------------------------------------------------

@api_router.get("/history/joint")
async def joint_history(joint_id: str = "J2", days: int = 30, conveyor_id: str = "conv-01"):
    """Return joint_history rows for the given joint over the last `days`.

    Paginates past the PostgREST 1000-row cap; queried desc for latency and
    returned ascending for chart use.
    """
    if joint_id not in ("J1", "J2", "J3", "J4"):
        raise HTTPException(400, "joint_id must be J1|J2|J3|J4")
    days = max(1, min(365, days))
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    try:
        res = await sb.select(
            "joint_history",
            filters={
                "joint_id":    f"eq.{joint_id}",
                "conveyor_id": f"eq.{conveyor_id}",
                "timestamp":   f"gte.{since}",
            },
            order="timestamp.desc",
            limit=4000,
            paginate=True,
        )
    except sb.SupabaseError as e:
        raise HTTPException(502, f"Supabase upstream error: {e.status}")
    rows = list(reversed(res["rows"]))
    return {"joint_id": joint_id, "days": days, "rows": rows}


def _downsample(rows: List[Dict[str, Any]], target: int) -> List[Dict[str, Any]]:
    if len(rows) <= target:
        return rows
    stride = math.ceil(len(rows) / target)
    picked = rows[::stride]
    # Always include the final row so charts terminate at the true latest timestamp.
    if picked and picked[-1] is not rows[-1]:
        picked.append(rows[-1])
    return picked


@api_router.get("/history/all-joints")
async def history_all(days: int = 30, conveyor_id: str = "conv-01"):
    """Return the health trend for J1-J4 over `days` with server-side downsampling."""
    days = max(1, min(365, days))
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    target_points = 300 if days >= 60 else 200

    async def _one(joint: str):
        try:
            r = await sb.select(
                "joint_history",
                filters={
                    "joint_id":    f"eq.{joint}",
                    "conveyor_id": f"eq.{conveyor_id}",
                    "timestamp":   f"gte.{since}",
                },
                order="timestamp.desc",
                select_cols="timestamp,health_score,confidence,risk_state,event_type",
                limit=4000,
                paginate=True,
            )
            rows_asc = list(reversed(r["rows"]))
            return joint, _downsample(rows_asc, target_points)
        except sb.SupabaseError:
            return joint, []

    import asyncio
    results = await asyncio.gather(*[_one(j) for j in ["J1", "J2", "J3", "J4"]])
    return {"days": days, "joints": {j: rows for j, rows in results}}


@api_router.get("/joint/passport")
async def joint_passport(joint_id: str = "J2", conveyor_id: str = "conv-01"):
    """Health Passport: latest state + downsampled 90-day history + last anomalies."""
    if joint_id not in ("J1", "J2", "J3", "J4"):
        raise HTTPException(400, "joint_id must be J1|J2|J3|J4")
    since = (datetime.now(timezone.utc) - timedelta(days=90)).isoformat()
    try:
        latest = await sb.select(
            "joint_history",
            filters={"joint_id": f"eq.{joint_id}", "conveyor_id": f"eq.{conveyor_id}"},
            order="timestamp.desc",
            limit=1,
        )
        trend = await sb.select(
            "joint_history",
            filters={
                "joint_id":    f"eq.{joint_id}",
                "conveyor_id": f"eq.{conveyor_id}",
                "timestamp":   f"gte.{since}",
            },
            order="timestamp.desc",
            select_cols="timestamp,health_score,confidence,risk_state,event_type",
            limit=4000,
            paginate=True,
        )
        anomalies = await sb.select(
            "joint_history",
            filters={
                "joint_id":    f"eq.{joint_id}",
                "conveyor_id": f"eq.{conveyor_id}",
                "event_type":  "neq.NORMAL",
            },
            order="timestamp.desc",
            limit=10,
        )
    except sb.SupabaseError as e:
        raise HTTPException(502, f"Supabase upstream error: {e.status}")
    trend_asc = list(reversed(trend["rows"]))
    return {
        "joint_id": joint_id,
        "latest":    latest["rows"][0] if latest["rows"] else None,
        "trend_90d": _downsample(trend_asc, 400),
        "trend_full_count": len(trend_asc),
        "recent_anomalies": anomalies["rows"],
    }


@api_router.get("/sensors")
async def sensor_status(conveyor_id: str = "conv-01"):
    try:
        res = await sb.select(
            "sensor_status",
            filters={"conveyor_id": f"eq.{conveyor_id}"},
            order="sensor_name.asc",
        )
    except sb.SupabaseError as e:
        raise HTTPException(502, f"Supabase upstream error: {e.status}")
    return {"sensors": res["rows"]}


class SeedRequest(BaseModel):
    force: bool = False
    token: Optional[str] = None


@api_router.post("/admin/seed")
async def seed_endpoint(req: SeedRequest):
    """Idempotent seed: skips if data already exists (unless force=True).

    Gated behind SEED_ADMIN_TOKEN in .env when set (recommended for anything past demo).
    """
    admin = os.environ.get("SEED_ADMIN_TOKEN")
    if admin and req.token != admin:
        raise HTTPException(401, "invalid admin token")
    from synthetic_seed import build_dataset
    ds = build_dataset()
    result: Dict[str, Any] = {}
    for tbl in ["sensor_status", "joint_history", "conveyor_telemetry"]:
        existing = await sb.count(tbl)
        if existing > 0 and not req.force:
            result[tbl] = {"status": "skipped", "existing": existing}
            continue
        total = 0
        for i in range(0, len(ds[tbl]), 1000):
            total += await sb.insert(tbl, ds[tbl][i:i+1000])
        result[tbl] = {"status": "seeded", "inserted": total}
    return result


# ---------------------------------------------------------------------------
# App wiring
# ---------------------------------------------------------------------------

app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
