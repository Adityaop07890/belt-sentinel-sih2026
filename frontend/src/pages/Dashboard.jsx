import React, { useEffect, useState, useCallback } from "react";
import { fetchSnapshot, fetchTimeseries } from "@/lib/api";
import { SCENARIOS } from "@/lib/scenarios";
import Sidebar from "@/components/dashboard/Sidebar";
import ExecutiveBanner from "@/components/dashboard/ExecutiveBanner";
import JointMatrix from "@/components/dashboard/JointMatrix";
import VisionPanel from "@/components/dashboard/VisionPanel";
import TelemetryCharts from "@/components/dashboard/TelemetryCharts";
import AlertPanel from "@/components/dashboard/AlertPanel";
import HistoricalTrend from "@/components/dashboard/HistoricalTrend";
import { HardHat, LogOut, User } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { useNavigate } from "react-router-dom";

const POLL_MS = 1500;

export default function Dashboard() {
  const [scenario, setScenario] = useState("normal");
  const [snapshot, setSnapshot] = useState(null);
  const [series, setSeries]     = useState(null);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async (s) => {
    try {
      const [snap, ts] = await Promise.all([fetchSnapshot(s), fetchTimeseries(s, 60)]);
      setSnapshot(snap);
      setSeries(ts);
      setLoading(false);
    } catch (e) {
      // keep old state on failure
      console.error("snapshot load failed", e);
    }
  }, []);

  useEffect(() => { load(scenario); }, [scenario, load]);

  useEffect(() => {
    const id = setInterval(() => load(scenario), POLL_MS);
    return () => clearInterval(id);
  }, [scenario, load]);

  // number-key hotkeys 1..5
  useEffect(() => {
    const h = (e) => {
      const s = SCENARIOS.find((x) => x.hotkey === e.key);
      if (s) setScenario(s.key);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <div className="min-h-screen w-full flex bg-[#121416] grain-bg" data-testid="dashboard-root">
      <Sidebar scenario={scenario} onScenarioChange={setScenario} snapshot={snapshot} />

      <main className="flex-1 min-w-0 flex flex-col">
        <TopBar snapshot={snapshot} />

        <div className="px-6 py-4 space-y-4">
          {loading || !snapshot ? (
            <div className="text-[#757575] font-mono-tel text-sm">
              INITIALISING EDGE NODE...
            </div>
          ) : (
            <>
              <ExecutiveBanner snapshot={snapshot} series={series} />

              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 xl:col-span-8">
                  <JointMatrix snapshot={snapshot} />
                </div>
                <div className="col-span-12 xl:col-span-4">
                  <VisionPanel snapshot={snapshot} />
                </div>
              </div>

              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 xl:col-span-8">
                  <TelemetryCharts snapshot={snapshot} series={series} />
                </div>
                <div className="col-span-12 xl:col-span-4">
                  <AlertPanel snapshot={snapshot} />
                </div>
              </div>

              <HistoricalTrend />
            </>
          )}
        </div>

        <footer className="mt-auto px-6 py-3 border-t border-[#252729] text-[11px] font-mono-tel text-[#757575] flex items-center justify-between">
          <span>PS 26008 · SIH 2026 · AIoT Conveyor Belt Health Monitor · Edge = ESP32 + MPU6050 + MLX90614 + ACS712 + ESP32-CAM</span>
          <span>ISA-101 · ISO 10816-3</span>
        </footer>
      </main>
    </div>
  );
}

function TopBar({ snapshot }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const email = user?.email || "operator";
  const initial = (email[0] || "?").toUpperCase();
  const onLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };
  return (
    <div className="h-14 flex items-center justify-between px-6 border-b border-[#252729] bg-[#1A1C1E]">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 grid place-items-center bg-[#252729] border border-[#3A3E41]">
          <HardHat size={16} className="text-[#A0A0A0]" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[13px] font-semibold text-[#E2E2E2] tracking-wide">
            BELT-SENTINEL / MONITORING CONSOLE
          </span>
          <span className="text-[10px] font-mono-tel text-[#757575]">
            NODE-01 · IRON ORE HAULAGE · SECTOR B
          </span>
        </div>
      </div>
      <div className="flex items-center gap-6 font-mono-tel text-[11px] text-[#A0A0A0]">
        <span data-testid="topbar-scenario-label">
          MODE: <span className="text-[#E2E2E2]">{snapshot?.scenario_label ?? "—"}</span>
        </span>
        <span>UTC {new Date().toISOString().slice(11, 19)}</span>
        <div className="flex items-center gap-2 border-l border-[#252729] pl-4">
          <div
            className="h-6 w-6 grid place-items-center bg-[#252729] border border-[#3A3E41] text-[10px] font-mono-tel text-[#E2E2E2]"
            title={email}
            data-testid="topbar-user-initial"
          >
            {initial}
          </div>
          <span className="text-[10.5px] text-[#E2E2E2] truncate max-w-[180px]" data-testid="topbar-user-email">
            {email}
          </span>
          <button
            onClick={onLogout}
            data-testid="topbar-logout"
            className="inline-flex items-center gap-1 border border-[#3A3E41] hover:border-[#FF3333] hover:text-[#FF3333] px-2 py-1 text-[10px] font-mono-tel"
          >
            <LogOut size={11} /> LOGOUT
          </button>
        </div>
      </div>
    </div>
  );
}
