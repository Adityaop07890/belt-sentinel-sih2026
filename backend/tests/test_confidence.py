"""Iteration-4 regression: live.confidence field on /api/dashboard/snapshot."""
import os

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
API = base_url.rstrip("/") + "/api"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# Expected base confidence per scenario (jitter is +/-2%)
EXPECTED = {
    "normal": 96,
    "loose_joint": 88,
    "damaged_joint": 91,
    "misalignment": 84,
    "overload": 87,
}


class TestSnapshotConfidence:
    @pytest.mark.parametrize("scenario,base", sorted(EXPECTED.items()))
    def test_confidence_present_and_in_band(self, client, scenario, base):
        r = client.get(f"{API}/dashboard/snapshot", params={"scenario": scenario})
        assert r.status_code == 200, r.text[:300]
        body = r.json()
        assert "live" in body
        live = body["live"]
        assert "confidence" in live, f"live.confidence missing for {scenario}"
        c = live["confidence"]
        assert isinstance(c, (int, float))
        # noise is +/- 2% of base
        assert base * 0.97 <= c <= base * 1.03, f"{scenario} confidence {c} outside band of {base}"
        # no mongo _id leakage
        assert "_id" not in body

    def test_damaged_joint_confidence_high(self, client):
        r = client.get(f"{API}/dashboard/snapshot", params={"scenario": "damaged_joint"})
        assert r.status_code == 200
        c = r.json()["live"]["confidence"]
        assert 88 <= c <= 94, f"expected ~90-93, got {c}"

    def test_misalignment_confidence_below_90(self, client):
        r = client.get(f"{API}/dashboard/snapshot", params={"scenario": "misalignment"})
        assert r.status_code == 200
        c = r.json()["live"]["confidence"]
        assert c < 90, f"expected <90, got {c}"
        assert 81 <= c <= 87, f"expected ~82-86, got {c}"

    def test_damaged_higher_than_misalignment(self, client):
        a = client.get(f"{API}/dashboard/snapshot", params={"scenario": "damaged_joint"}).json()["live"]["confidence"]
        b = client.get(f"{API}/dashboard/snapshot", params={"scenario": "misalignment"}).json()["live"]["confidence"]
        assert a > b

    def test_unknown_scenario_400(self, client):
        r = client.get(f"{API}/dashboard/snapshot", params={"scenario": "does_not_exist"})
        assert r.status_code == 400, f"expected 400, got {r.status_code}"

    def test_confidence_varies_across_calls(self, client):
        vals = {
            client.get(f"{API}/dashboard/snapshot", params={"scenario": "normal"}).json()["live"]["confidence"]
            for _ in range(6)
        }
        assert len(vals) > 1, "confidence appears static (no jitter)"
