import React, { useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ResponsiveContainer, LineChart, Line, ReferenceArea, XAxis, YAxis,
  CartesianGrid, Tooltip, AreaChart, Area,
} from "recharts";
import { ISO_ZONES } from "@/lib/scenarios";

export default function TelemetryCharts({ snapshot, series }) {
  const data = useMemo(() => {
    if (!series?.t) return [];
    return series.t.map((t, i) => ({
      t,
      vibration:     series.vibration[i],
      thermal:       series.thermal[i],
      motor_current: series.motor_current[i],
      belt_speed:    series.belt_speed[i],
      anomaly_score: series.anomaly_score[i],
    }));
  }, [series]);

  return (
    <div
      data-testid="telemetry-charts"
      className="border border-[#252729] bg-[#1A1C1E] card-in"
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[#252729]">
        <div className="text-[10px] font-mono-tel tracking-[0.18em] text-[#757575]">
          DEEP DIAGNOSTIC TELEMETRY · LAST 60s
        </div>
        <div className="text-[10px] font-mono-tel text-[#5A6063]">
          1 Hz · ISO 10816-3
        </div>
      </div>

      <Tabs defaultValue="vibration" className="p-3">
        <TabsList className="bg-[#252729] rounded-none h-9 p-0 border border-[#3A3E41]">
          {[
            ["vibration", "Vibration"],
            ["thermal",   "Thermal ΔT"],
            ["motor",     "Motor / Speed"],
            ["anomaly",   "Anomaly Score"],
          ].map(([v, l]) => (
            <TabsTrigger
              key={v}
              value={v}
              data-testid={`tab-${v}`}
              className="rounded-none text-[11px] font-mono-tel tracking-wide h-full data-[state=active]:bg-[#1A1C1E] data-[state=active]:text-[#E2E2E2] text-[#A0A0A0]"
            >
              {l.toUpperCase()}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="vibration" className="mt-3 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#252729" vertical={false} />
              <XAxis dataKey="t" hide />
              <YAxis
                stroke="#5A6063"
                domain={[0, 8]}
                tickCount={5}
                tick={{ fontSize: 10, fill: "#757575", fontFamily: "JetBrains Mono" }}
                label={{ value: "mm/s", angle: -90, position: "insideLeft", fill: "#757575", fontSize: 10 }}
              />
              {ISO_ZONES.map((z) => (
                <ReferenceArea key={z.key} y1={z.from} y2={z.to} fill={z.color} fillOpacity={0.35} strokeOpacity={0} />
              ))}
              <Tooltip content={<HmiTooltip unit="mm/s" />} />
              <Line
                type="monotone"
                dataKey="vibration"
                stroke="#E2E2E2"
                strokeWidth={1.4}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-1 flex gap-3 text-[10px] font-mono-tel text-[#5A6063]">
            {ISO_ZONES.map((z) => (
              <div key={z.key} className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2" style={{ background: z.color }} />
                Zone {z.key} · {z.label}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="thermal" className="mt-3 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="thermalFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFBF00" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#FFBF00" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#252729" vertical={false} />
              <XAxis dataKey="t" hide />
              <YAxis stroke="#5A6063" domain={[0, 20]}
                     tick={{ fontSize: 10, fill: "#757575", fontFamily: "JetBrains Mono" }}
                     label={{ value: "°C ΔT", angle: -90, position: "insideLeft", fill: "#757575", fontSize: 10 }} />
              <Tooltip content={<HmiTooltip unit="°C" />} />
              <Area type="monotone" dataKey="thermal" stroke="#FFBF00" fill="url(#thermalFill)" strokeWidth={1.4} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </TabsContent>

        <TabsContent value="motor" className="mt-3 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#252729" vertical={false} />
              <XAxis dataKey="t" hide />
              <YAxis yAxisId="left"  stroke="#5A6063" domain={[0, 40]}
                     tick={{ fontSize: 10, fill: "#757575", fontFamily: "JetBrains Mono" }}
                     label={{ value: "A", angle: -90, position: "insideLeft", fill: "#757575", fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" stroke="#5A6063" domain={[0, 3]}
                     tick={{ fontSize: 10, fill: "#757575", fontFamily: "JetBrains Mono" }} />
              <Tooltip content={<HmiTooltip />} />
              <Line yAxisId="left"  type="monotone" dataKey="motor_current" stroke="#E2E2E2" strokeWidth={1.4} dot={false} isAnimationActive={false} name="Current (A)" />
              <Line yAxisId="right" type="monotone" dataKey="belt_speed"    stroke="#4A90E2" strokeWidth={1.2} dot={false} isAnimationActive={false} name="Speed (m/s)" />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-1 flex gap-4 text-[10px] font-mono-tel text-[#5A6063]">
            <div className="flex items-center gap-1.5"><span className="inline-block h-[2px] w-4 bg-[#E2E2E2]" /> Current (A)</div>
            <div className="flex items-center gap-1.5"><span className="inline-block h-[2px] w-4 bg-[#4A90E2]" /> Speed (m/s)</div>
          </div>
        </TabsContent>

        <TabsContent value="anomaly" className="mt-3 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="anomalyFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF3333" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#FF3333" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#252729" vertical={false} />
              <XAxis dataKey="t" hide />
              <YAxis stroke="#5A6063" domain={[0, 1]}
                     tick={{ fontSize: 10, fill: "#757575", fontFamily: "JetBrains Mono" }} />
              <ReferenceArea y1={0.7} y2={1} fill="#5A2020" fillOpacity={0.35} strokeOpacity={0} />
              <ReferenceArea y1={0.35} y2={0.7} fill="#5A4A1F" fillOpacity={0.35} strokeOpacity={0} />
              <Tooltip content={<HmiTooltip />} />
              <Area type="monotone" dataKey="anomaly_score" stroke="#FF3333" fill="url(#anomalyFill)" strokeWidth={1.4} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-1 text-[10px] font-mono-tel text-[#5A6063]">Isolation Forest fused score · &gt;0.7 = critical</div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HmiTooltip({ active, payload, unit }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-[#252729] border border-[#3A3E41] px-2 py-1 text-[11px] font-mono-tel text-[#E2E2E2]">
      {payload.map((p, i) => (
        <div key={i} className="flex justify-between gap-3">
          <span style={{ color: p.color }}>{p.name || p.dataKey}</span>
          <span>{Number(p.value).toFixed(2)}{unit ? ` ${unit}` : ""}</span>
        </div>
      ))}
    </div>
  );
}
