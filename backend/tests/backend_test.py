"""Belt-Sentinel iteration-3 backend tests.

Covers the regression fix for the Supabase PostgREST 1000-row cap
(offset pagination + desc ordering + server-side downsampling),
query validation, and the iteration-1 simulator/LLM regression suite.
"""
import os
from datetime import datetime, timezone, timedelta

import requests
import pytest
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"

JOINTS = ["J1", "J2", "J3", "J4"]


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _ts_ascending(rows):
    ts = [r["timestamp"] for r in rows]
    return ts == sorted(ts)


def _parse(ts: str) -> datetime:
    ts = ts.replace("Z", "+00:00")
    d = datetime.fromisoformat(ts)
    if d.tzinfo is None:
        d = d.replace(tzinfo=timezone.utc)
    return d


# --- module: sensors -------------------------------------------------------
class TestSensors:
    def test_sensors_returns_five(self, client):
        r = client.get(f"{API}/sensors", timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "sensors" in data
        sensors = data["sensors"]
        assert len(sensors) == 5, f"expected 5 sensors, got {len(sensors)}"
        names = {s["sensor_name"] for s in sensors}
        for expected in ["MPU6050", "MLX90614", "ACS712", "IR Encoder", "ESP32-CAM"]:
            assert expected in names, f"missing sensor {expected}; got {names}"
        for s in sensors:
            assert "status" in s and "quality" in s and "last_seen" in s
            assert "_id" not in s

    def test_sensors_unknown_conveyor_empty(self, client):
        r = client.get(f"{API}/sensors", params={"conveyor_id": "TEST_none"}, timeout=60)
        assert r.status_code == 200
        assert r.json()["sensors"] == []


# --- module: history/all-joints (REGRESSION: 1000-row cap fix) -------------
class TestAllJoints:
    @pytest.fixture(scope="class")
    def windows(self, client):
        out = {}
        for days in [30, 60, 90]:
            r = client.get(f"{API}/history/all-joints", params={"days": days}, timeout=120)
            assert r.status_code == 200, f"days={days}: {r.text[:300]}"
            out[days] = r.json()
        return out

    def test_structure_and_ordering_30d(self, windows):
        joints = windows[30]["joints"]
        assert set(joints.keys()) == set(JOINTS)
        for j, rows in joints.items():
            assert 150 <= len(rows) <= 350, f"{j} 30d point count out of downsample range: {len(rows)}"
            assert _ts_ascending(rows), f"{j} timestamps not ascending"
            for k in ["timestamp", "health_score", "confidence", "risk_state", "event_type"]:
                assert k in rows[0], f"{j} missing key {k}"

    def test_all_windows_downsampled(self, windows):
        for days, data in windows.items():
            for j, rows in data["joints"].items():
                assert len(rows) <= 400, f"days={days} {j} not downsampled: {len(rows)}"
                assert len(rows) > 100, f"days={days} {j} too few points: {len(rows)}"

    def test_last_timestamp_is_newest_data(self, windows):
        """The old bug returned the OLDEST 1000 rows (series ended 2026-07-30)."""
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        for days, data in windows.items():
            for j in JOINTS:
                last = _parse(data["joints"][j][-1]["timestamp"])
                assert last >= cutoff, (
                    f"days={days} {j} last timestamp {last.isoformat()} is older than 24h "
                    f"- stale/truncated window (old 1000-row-cap bug)"
                )

    def test_first_timestamp_shifts_back_per_window(self, windows):
        for j in JOINTS:
            f30 = _parse(windows[30]["joints"][j][0]["timestamp"])
            f60 = _parse(windows[60]["joints"][j][0]["timestamp"])
            f90 = _parse(windows[90]["joints"][j][0]["timestamp"])
            assert f60 < f30, f"{j}: 60d first_ts {f60} not earlier than 30d {f30}"
            assert f90 < f60, f"{j}: 90d first_ts {f90} not earlier than 60d {f60}"
            d1 = (f30 - f60).total_seconds() / 86400
            assert 20 <= d1 <= 40, f"{j}: 30d->60d shift is {d1:.1f} days (expected ~30)"
            # NOTE: seeded joint_history only starts 2026-06-18 (~78 days of data),
            # so the 90d window is capped by data availability (~15 days earlier than
            # 60d) rather than by the query. Only monotonicity is asserted here.
            d2 = (f60 - f90).total_seconds() / 86400
            assert d2 > 0, f"{j}: 60d->90d shift is {d2:.1f} days"

    def test_60_and_90_differ(self, windows):
        for j in JOINTS:
            s60 = [r["timestamp"] for r in windows[60]["joints"][j]]
            s90 = [r["timestamp"] for r in windows[90]["joints"][j]]
            assert s60 != s90, f"{j}: 60D and 90D series are identical"

    def test_days_clamped(self, client):
        for days, expected in [(-1, 1), (0, 1), (99999, 365)]:
            r = client.get(f"{API}/history/all-joints", params={"days": days}, timeout=120)
            assert r.status_code == 200, f"days={days} -> {r.status_code}: {r.text[:200]}"
            assert r.json()["days"] == expected, f"days={days} not clamped to {expected}"


# --- module: history/joint (validation) ------------------------------------
class TestJointHistory:
    def test_joint_history_j2(self, client):
        r = client.get(f"{API}/history/joint", params={"joint_id": "J2", "days": 30}, timeout=120)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["joint_id"] == "J2"
        assert data["days"] == 30
        rows = data["rows"]
        assert len(rows) > 0
        for k in ["health_score", "confidence", "risk_state", "event_type"]:
            assert k in rows[0], f"missing {k}"
        assert all(r_["joint_id"] == "J2" for r_ in rows)
        assert _ts_ascending(rows)
        last = _parse(rows[-1]["timestamp"])
        assert last >= datetime.now(timezone.utc) - timedelta(hours=24), \
            f"history/joint ends at {last.isoformat()} - not the newest data"

    def test_invalid_joint_id_400(self, client):
        r = client.get(f"{API}/history/joint", params={"joint_id": "INVALID"}, timeout=60)
        assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text[:200]}"

    @pytest.mark.parametrize("days,expected", [(-1, 1), (99999, 365)])
    def test_days_clamped_no_500(self, client, days, expected):
        r = client.get(f"{API}/history/joint",
                       params={"joint_id": "J2", "days": days}, timeout=120)
        assert r.status_code == 200, f"days={days} -> {r.status_code}: {r.text[:200]}"
        assert r.json()["days"] == expected


# --- module: joint/passport ------------------------------------------------
class TestPassport:
    def test_passport_j2(self, client):
        r = client.get(f"{API}/joint/passport", params={"joint_id": "J2"}, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["joint_id"] == "J2"
        assert d["latest"] is not None
        assert "health_score" in d["latest"]
        assert d["trend_full_count"] > 1500, f"trend_full_count={d['trend_full_count']}"
        trend = d["trend_90d"]
        assert len(trend) <= 400, f"trend_90d not downsampled: {len(trend)}"
        assert len(trend) > 100
        assert _ts_ascending(trend)
        last = _parse(trend[-1]["timestamp"])
        assert last >= datetime.now(timezone.utc) - timedelta(hours=24), \
            f"trend_90d ends at {last.isoformat()} - not the newest data"
        # internal consistency: trend end should match latest row
        assert _parse(d["latest"]["timestamp"]) >= last
        assert isinstance(d["recent_anomalies"], list)
        assert all(a["event_type"] != "NORMAL" for a in d["recent_anomalies"])

    def test_passport_invalid_joint_400(self, client):
        r = client.get(f"{API}/joint/passport", params={"joint_id": "BAD"}, timeout=60)
        assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text[:200]}"


# --- module: simulator regression ----------------------------------------
class TestSimulatorRegression:
    def test_snapshot_damaged_joint(self, client):
        r = client.get(f"{API}/dashboard/snapshot", params={"scenario": "damaged_joint"}, timeout=60)
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), dict) and len(r.json()) > 0

    def test_timeseries_normal(self, client):
        r = client.get(f"{API}/dashboard/timeseries", params={"scenario": "normal", "points": 60}, timeout=60)
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), dict)

    def test_ai_recommendation_sse(self, client):
        r = client.post(
            f"{API}/ai/recommendation",
            json={"scenario": "damaged_joint", "alert_id": "alrt-damaged-j2"},
            timeout=180, stream=True,
        )
        assert r.status_code == 200, r.text
        chunks = []
        for line in r.iter_lines(decode_unicode=True):
            if line:
                chunks.append(line)
            if line and "[DONE]" in line:
                break
        body = "\n".join(chunks)
        assert "[DONE]" in body, body[:500]
        assert "[ERROR]" not in body, body[:800]
        assert len(chunks) > 2, "stream produced too few events"


# --- module: admin/seed idempotency --------------------------------------
class TestSeed:
    def test_seed_skips(self, client):
        r = client.post(f"{API}/admin/seed", json={"force": False}, timeout=180)
        assert r.status_code == 200, r.text
        d = r.json()
        for tbl in ["sensor_status", "joint_history", "conveyor_telemetry"]:
            assert d[tbl]["status"] == "skipped", f"{tbl} was not skipped: {d[tbl]}"
