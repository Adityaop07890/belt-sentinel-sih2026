"""Synthetic dataset generator for SIH 2026 PS-26008 (Belt-Sentinel).

Produces 15,000 sequential rows across 75 days for four joints (J1-J4) and five
scenarios: normal, loose_joint, damaged_joint, misalignment, overload.

Design principles:
- Multimodal signals are correlated (vibration ↑ ⇒ thermal ↑ ⇒ anomaly ↑ ⇒ health ↓).
- Historical episodes are laid out over the 75-day timeline so 30/90-day charts show
  a real progression (stable → warning → worsening → inspection).
- Values match the physical characteristics of an iron-ore mining conveyor belt
  (belt speed 1-3 m/s, motor current 15-35 A, vibration RMS ISO 10816-3 bands,
  ambient thermal delta 0-20 °C).
"""
from __future__ import annotations
import math
import random
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Tuple

CONVEYOR_ID = "conv-01"
JOINTS = ["J1", "J2", "J3", "J4"]

# 15,000 rows over 75 days across 4 joints ⇒ every 30 minutes per joint.
DAYS = 75
INTERVAL_MIN = 30
TOTAL_ROWS = 15_000

RISK_STABLE  = "STABLE"
RISK_MONITOR = "MONITOR"
RISK_INSPECT = "INSPECT_SOON"
RISK_HIGH    = "HIGH_RISK"

# ----------------------------------------------------------------------
# Episode timeline
# ----------------------------------------------------------------------
# (day_start, day_end, scenario, primary_joint or None)
EPISODES: List[Tuple[int, int, str, str | None]] = [
    (0,  20, "normal",         None),
    (20, 30, "damaged_joint",  "J4"),   # short prior J4 event that was repaired
    (30, 45, "normal",         None),
    (45, 55, "loose_joint",    "J2"),   # J2 starts loosening
    (55, 62, "damaged_joint",  "J2"),   # J2 rapid decline
    (62, 65, "misalignment",   None),   # belt misalignment episode
    (65, 68, "overload",       None),   # motor overload spike
    (68, 75, "normal",         None),   # post-inspection recovery
]


def _scenario_for(day: int) -> Tuple[str, str | None]:
    for s, e, sc, pj in EPISODES:
        if s <= day < e:
            return sc, pj
    return "normal", None


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def _sample_joint(scenario: str, primary: str | None, joint: str,
                  ep_progress: float) -> Dict[str, Any]:
    """Produce a correlated sample for the given joint under an episode.

    ep_progress ∈ [0, 1]: 0 at start of episode, 1 at end. Used for gradual decline.
    """
    is_target = (primary is not None and primary == joint)
    r = random.random  # shorthand

    # Baselines (Normal)
    belt_speed     = 2.4 + random.uniform(-0.05, 0.05)
    motor_current  = 18.0 + random.uniform(-0.6, 0.6)
    vibration_rms  = 1.5 + random.uniform(-0.15, 0.15)
    thermal_delta  = 2.2 + random.uniform(-0.4, 0.4)
    motor_rpm      = 1455 + random.randint(-6, 6)
    anomaly_score  = 0.10 + random.uniform(-0.03, 0.03)
    health_score   = 96 + random.uniform(-2, 2)
    confidence     = 0.96 + random.uniform(-0.03, 0.02)
    vision_status  = "NOMINAL"
    vision_conf    = 0.0
    sensor_state   = "ALL_OK"
    event_type     = "NORMAL"
    risk           = RISK_STABLE

    if scenario == "loose_joint" and is_target:
        # Gradual decline 91 → 69, mild thermal, periodic vibration spikes
        health_score  = 91 - ep_progress * 22 + random.uniform(-2, 2)
        vibration_rms = 1.6 + ep_progress * 1.6 + (random.uniform(0.4, 1.1) if random.random() < 0.35 else 0)
        thermal_delta = 2.2 + ep_progress * 2.5 + random.uniform(-0.4, 0.6)
        anomaly_score = 0.15 + ep_progress * 0.35 + random.uniform(-0.04, 0.04)
        confidence    = 0.92 - ep_progress * 0.06 + random.uniform(-0.02, 0.02)
        event_type    = "LOOSE_JOINT"
        risk          = RISK_MONITOR if ep_progress < 0.6 else RISK_INSPECT
    elif scenario == "damaged_joint" and is_target:
        # Rapid decline 72 → 25, high thermal, CNN detects damage
        health_score  = 72 - ep_progress * 47 + random.uniform(-3, 3)
        vibration_rms = 3.4 + ep_progress * 2.6 + random.uniform(-0.2, 0.5)
        thermal_delta = 4.5 + ep_progress * 11 + random.uniform(-0.5, 0.8)
        anomaly_score = 0.55 + ep_progress * 0.4 + random.uniform(-0.04, 0.04)
        confidence    = 0.90 + random.uniform(-0.05, 0.02)  # high (all modalities agree)
        vision_status = "CRACK_DETECTED" if random.random() > 0.35 else "FIBER_SEPARATION"
        vision_conf   = _clamp(0.80 + ep_progress * 0.15 + random.uniform(-0.03, 0.03), 0.80, 0.97)
        motor_current = 19.5 + ep_progress * 3.2 + random.uniform(-0.4, 0.6)
        event_type    = "DAMAGED_JOINT"
        risk          = RISK_HIGH
    elif scenario == "misalignment":
        # Systemic — affects every joint, but at moderate level
        health_score  = 82 - ep_progress * 15 + random.uniform(-3, 3)
        vibration_rms = 1.9 + ep_progress * 1.1 + random.uniform(-0.15, 0.3)  # lateral bias
        thermal_delta = 3.5 + ep_progress * 3.2 + random.uniform(-0.5, 0.5)
        anomaly_score = 0.32 + ep_progress * 0.28 + random.uniform(-0.03, 0.03)
        confidence    = 0.88 + random.uniform(-0.04, 0.02)
        event_type    = "BELT_MISALIGNMENT"
        risk          = RISK_MONITOR if ep_progress < 0.5 else RISK_INSPECT
    elif scenario == "overload":
        # Motor overload — high current, low speed, systemic anomaly
        health_score  = 68 - ep_progress * 20 + random.uniform(-3, 3)
        motor_current = 27 + ep_progress * 8 + random.uniform(-0.6, 0.9)
        belt_speed    = _clamp(2.2 - ep_progress * 0.9 + random.uniform(-0.15, 0.05), 0.9, 2.4)
        vibration_rms = 2.6 + ep_progress * 1.6 + random.uniform(-0.2, 0.4)
        thermal_delta = 5 + ep_progress * 5.5 + random.uniform(-0.4, 0.7)
        anomaly_score = 0.5 + ep_progress * 0.3 + random.uniform(-0.04, 0.04)
        motor_rpm     = 1490 + random.randint(-8, 12)
        confidence    = 0.87 + random.uniform(-0.04, 0.02)
        event_type    = "MOTOR_OVERLOAD"
        risk          = RISK_HIGH if ep_progress > 0.5 else RISK_INSPECT

    # ---- Rare sensor degradation / modality-disagreement scenarios ----
    roll = random.random()
    if roll < 0.008:
        # ESP32-CAM degraded — reduce vision confidence
        sensor_state   = "ESP32_CAM_DEGRADED"
        vision_conf    = _clamp(vision_conf * 0.4, 0.0, 0.6)
        confidence     = _clamp(confidence - 0.15, 0.4, 1.0)
    elif roll < 0.012:
        # MPU6050 offline — no vibration reading
        sensor_state   = "MPU6050_OFFLINE"
        vibration_rms  = 0.0
        confidence     = _clamp(confidence - 0.25, 0.35, 1.0)
    elif roll < 0.016:
        # MLX90614 degraded
        sensor_state   = "MLX90614_DEGRADED"
        thermal_delta  = thermal_delta * 0.5
        confidence     = _clamp(confidence - 0.10, 0.4, 1.0)
    elif roll < 0.020 and scenario == "normal":
        # Modality disagreement: vision flags an issue but physical sensors OK
        vision_status  = "CRACK_DETECTED"
        vision_conf    = 0.72 + random.uniform(-0.05, 0.05)
        event_type     = "MODALITY_DISAGREEMENT"
        confidence     = 0.55 + random.uniform(-0.05, 0.05)   # low overall confidence
        risk           = RISK_INSPECT

    health_score  = _clamp(health_score, 5, 100)
    confidence    = _clamp(confidence, 0.30, 0.99)
    anomaly_score = _clamp(anomaly_score, 0.0, 1.0)
    vibration_rms = _clamp(vibration_rms, 0.0, 9.5)
    thermal_delta = _clamp(thermal_delta, 0.0, 22.0)

    return dict(
        health_score=round(health_score, 2),
        belt_speed=round(belt_speed, 3),
        motor_current=round(motor_current, 2),
        vibration_rms=round(vibration_rms, 3),
        temperature_delta=round(thermal_delta, 2),
        motor_rpm=int(motor_rpm),
        anomaly_score=round(anomaly_score, 3),
        confidence=round(confidence, 3),
        vision_status=vision_status,
        vision_confidence=round(vision_conf, 3),
        sensor_status=sensor_state,
        event_type=event_type,
        risk_state=risk,
    )


def build_dataset() -> Dict[str, List[Dict[str, Any]]]:
    """Generate rows for conveyor_telemetry, joint_history, and sensor_status."""
    random.seed(20260826)  # deterministic seed

    now = datetime.now(timezone.utc).replace(microsecond=0, second=0)
    start = now - timedelta(days=DAYS)

    telemetry: List[Dict[str, Any]] = []
    history:   List[Dict[str, Any]] = []

    total_intervals = TOTAL_ROWS // len(JOINTS)  # 3,750 per joint
    step = timedelta(minutes=INTERVAL_MIN)

    for i in range(total_intervals):
        ts = start + i * step
        day_offset = (ts - start).total_seconds() / 86400.0
        scenario, primary = _scenario_for(day_offset)
        # find episode progress
        ep_progress = 0.0
        for s, e, sc, _pj in EPISODES:
            if s <= day_offset < e and sc == scenario:
                ep_progress = (day_offset - s) / max(1e-9, e - s)
                break

        for joint in JOINTS:
            sample = _sample_joint(scenario, primary, joint, ep_progress)
            iso_ts = ts.isoformat()

            telemetry.append({
                "timestamp":         iso_ts,
                "conveyor_id":       CONVEYOR_ID,
                "joint_id":          joint,
                "scenario":          scenario,
                "belt_speed":        sample["belt_speed"],
                "motor_current":     sample["motor_current"],
                "vibration_rms":     sample["vibration_rms"],
                "temperature_delta": sample["temperature_delta"],
                "motor_rpm":         sample["motor_rpm"],
                "anomaly_score":     sample["anomaly_score"],
                "health_score":      sample["health_score"],
                "confidence":        sample["confidence"],
                "vision_status":     sample["vision_status"],
                "vision_confidence": sample["vision_confidence"],
                "sensor_status":     sample["sensor_status"],
            })

            # Downsample history to hourly per joint for a lighter trend table.
            if i % 2 == 0:  # every 60 min
                inspection = "SCHEDULED" if sample["risk_state"] in (RISK_INSPECT, RISK_HIGH) else "NONE"
                history.append({
                    "timestamp":         iso_ts,
                    "conveyor_id":       CONVEYOR_ID,
                    "joint_id":          joint,
                    "health_score":      sample["health_score"],
                    "confidence":        sample["confidence"],
                    "vibration_rms":     sample["vibration_rms"],
                    "temperature_delta": sample["temperature_delta"],
                    "motor_current":     sample["motor_current"],
                    "anomaly_score":     sample["anomaly_score"],
                    "vision_status":     sample["vision_status"],
                    "vision_confidence": sample["vision_confidence"],
                    "risk_state":        sample["risk_state"],
                    "event_type":        sample["event_type"],
                    "inspection_status": inspection,
                })

    # Sensor status: one row per sensor (current snapshot).
    sensors = [
        ("MPU6050",   "ONLINE",   0.98),
        ("MLX90614",  "ONLINE",   0.96),
        ("ACS712",    "ONLINE",   0.99),
        ("IR Encoder","ONLINE",   0.99),
        ("ESP32-CAM", "ONLINE",   0.93),
    ]
    sensor_rows = [{
        "timestamp":   now.isoformat(),
        "conveyor_id": CONVEYOR_ID,
        "sensor_name": name,
        "status":      status,
        "quality":     quality,
        "last_seen":   now.isoformat(),
    } for name, status, quality in sensors]

    return {
        "conveyor_telemetry": telemetry,
        "joint_history":      history,
        "sensor_status":      sensor_rows,
    }
