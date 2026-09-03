import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceArea,
} from "recharts";
import { API } from "@/lib/api";

const RANGES = [
  { key: 30, label: "30D" },
  { key: 60, label: "60D" },
  { key: 90, label: "90D" },
];

const JOINT_COLORS = {
  J1: "#5A6063",
  J2: "#FF3333",
  J3: "#4A90E2",
  J4: "#FFBF00",
};

export default function HistoricalTrend() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = () => {
      setErr("");
      axios.get(`${API}/history/all-joints`, { params: { days } })
        .then((r) => { if (mounted) { setData(r.data); setLoading(false); } })
        .catch((e) => { if (mounted) { setErr(e?.message || "load failed"); setLoading(false); } });
    };
    setLoading(true);
    load();
    const refreshId = setInterval(load, 5000);
    return () => { mounted = false; clearInterval(refreshId); };
  }, [days]);

  // Merge into a single series by timestamp (bucket to hourly for readability)
  const merged = useMemo(() => {
    if (!data?.joints) return [];
    const byTs = new Map();
    for (const j of ["J1", "J2", "J3", "J4"]) {
      const rows = data.joints[j] || [];
      const stride = Math.max(1, Math.floor(rows.length / 220));
      rows.forEach((r, i) => {
        if (i % stride !== 0) return;
        const ts = r.timestamp;
        if (!byTs.has(ts)) byTs.set(ts, { ts });
        byTs.get(ts)[j] = r.health_score;
      });
    }
    return [...byTs.values()].sort((a, b) => a.ts.localeCompare(b.ts));
  }, [data]);

  return (
    <div
      data-testid="historical-trend"
      className="border border-[#252729] bg-[#1A1C1E] card-in"
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[#252729]">
        <div className="text-[10px] font-mono-tel tracking-[0.18em] text-[#757575]">
          HISTORICAL HEALTH TREND · LIVE SYNC · SUPABASE
        </div>
        <div className="flex gap-1" data-testid="trend-range-selector">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setDays(r.key)}
              data-testid={`trend-range-${r.key}`}
              className={
                "px-2 py-0.5 text-[10px] font-mono-tel tracking-wider border " +
                (days === r.key
                  ? "border-[#5A6063] text-[#E2E2E2] bg-[#252729]"
                  : "border-[#252729] text-[#5A6063] hover:text-[#A0A0A0]")
              }
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 h-64">
        {loading ? (
          <div className="h-full grid place-items-center text-[11px] font-mono-tel text-[#5A6063]">
            LOADING HISTORICAL DATA...
          </div>
        ) : err ? (
          <div className="h-full grid place-items-center text-[11px] font-mono-tel text-[#FF3333]" data-testid="trend-error">
            FAILED TO LOAD: {err}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={merged} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#252729" vertical={false} />
              <XAxis dataKey="ts" hide />
              <YAxis
                stroke="#5A6063" domain={[0, 100]} tickCount={6}
                tick={{ fontSize: 10, fill: "#757575", fontFamily: "JetBrains Mono" }}
                label={{ value: "Health", angle: -90, position: "insideLeft", fill: "#757575", fontSize: 10 }}
              />
              {/* Health thresholds */}
              <ReferenceArea y1={0}  y2={40} fill="#5A2020" fillOpacity={0.20} strokeOpacity={0} />
              <ReferenceArea y1={40} y2={70} fill="#5A4A1F" fillOpacity={0.20} strokeOpacity={0} />
              <Tooltip
                contentStyle={{ background: "#252729", border: "1px solid #3A3E41", fontFamily: "JetBrains Mono", fontSize: 11 }}
                labelStyle={{ color: "#757575" }}
                itemStyle={{ color: "#E2E2E2" }}
                labelFormatter={(ts) => new Date(ts).toISOString().slice(0, 16).replace("T", " ")}
              />
              <Legend
                verticalAlign="top"
                wrapperStyle={{ fontFamily: "JetBrains Mono", fontSize: 10, color: "#A0A0A0" }}
              />
              {["J1", "J2", "J3", "J4"].map((j) => (
                <Line
                  key={j}
                  type="monotone"
                  dataKey={j}
                  stroke={JOINT_COLORS[j]}
                  strokeWidth={j === "J2" ? 1.6 : 1.2}
                  dot={false}
                  isAnimationActive={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="px-4 pb-3 text-[10px] font-mono-tel text-[#5A6063] flex items-center justify-between">
        <span>Data: joint_history · conveyor conv-01 · 4 joints</span>
        <span>{merged.length ? `${merged.length} points shown` : ""}</span>
      </div>
    </div>
  );
}
