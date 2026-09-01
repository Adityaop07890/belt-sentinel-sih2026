import React from "react";
import HealthGauge from "@/components/dashboard/HealthGauge";
import { ResponsiveContainer, LineChart, Line, YAxis } from "recharts";

export default function ExecutiveBanner({ snapshot, series }) {
  const { live, alerts, iso_zone } = snapshot;
  const criticals = (alerts || []).filter((a) => a.severity === "critical");
  const warnings  = (alerts || []).filter((a) => a.severity === "warning");

  const trend = (series?.health_30d ?? []).map((v, i) => ({ i, v }));

  return (
    <div
      data-testid="executive-banner"
      className="grid grid-cols-12 gap-3 border border-[#252729] bg-[#1A1C1E] card-in"
    >
      {/* Health gauge */}
      <div className="col-span-12 md:col-span-3 border-r border-[#252729] p-4">
        <HeaderRow left="GLOBAL BELT HEALTH" right="0–100" />
        <HealthGauge value={live.health_score} />
        <div className="mt-2 flex items-baseline justify-between border-t border-[#252729] pt-2">
          <span className="text-[10px] font-mono-tel tracking-[0.15em] text-[#757575]">
            PREDICTION CONFIDENCE
          </span>
          <span
            data-testid="metric-confidence"
            className={
              "font-mono-tel text-[16px] font-semibold " +
              (live.confidence >= 90 ? "text-[#E2E2E2]" :
               live.confidence >= 75 ? "text-[#FFBF00]" : "text-[#FF3333]")
            }
          >
            {live.confidence.toFixed(0)}<span className="text-[10px] text-[#757575] font-normal">%</span>
          </span>
        </div>
        <div className="mt-2 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <YAxis domain={[0, 100]} hide />
              <Line type="monotone" dataKey="v" stroke="#5A6063" strokeWidth={1.2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="text-[10px] font-mono-tel text-[#757575] tracking-wider">30-DAY TREND</div>
      </div>

      {/* Live metrics */}
      <div className="col-span-12 md:col-span-6 border-r border-[#252729] p-4 grid grid-cols-2 gap-x-6 gap-y-3">
        <Metric label="BELT SPEED"       value={live.belt_speed.toFixed(2)}   unit="m/s" testid="metric-belt-speed" />
        <Metric label="MOTOR CURRENT"    value={live.motor_current.toFixed(1)} unit="A"   testid="metric-motor-current" />
        <Metric label="VIBRATION RMS"    value={live.vibration_rms.toFixed(2)} unit="mm/s"
                accent={iso_zone === "D" ? "critical" : iso_zone === "C" ? "warning" : null}
                sub={`ISO Zone ${iso_zone}`} testid="metric-vibration" />
        <Metric label="THERMAL ΔT"       value={live.thermal_delta.toFixed(1)} unit="°C" testid="metric-thermal" />
        <Metric label="MOTOR RPM"        value={live.motor_rpm}                unit="rpm" testid="metric-rpm" />
        <Metric label="ANOMALY SCORE"    value={live.anomaly_score.toFixed(2)} unit=""
                accent={live.anomaly_score > 0.7 ? "critical" : live.anomaly_score > 0.35 ? "warning" : null}
                testid="metric-anomaly" />
      </div>

      {/* Alert marquee */}
      <div className="col-span-12 md:col-span-3 p-4 flex flex-col">
        <HeaderRow left="ACTIVE ALERTS" right={`${criticals.length}C · ${warnings.length}W`} />
        {alerts.length === 0 ? (
          <div className="mt-2 text-[12px] text-[#5A6063] font-mono-tel" data-testid="banner-alerts-empty">
            No active alerts. Belt operating within nominal thresholds.
          </div>
        ) : (
          <div className="mt-2 overflow-hidden relative">
            <div className="marquee-track whitespace-nowrap flex gap-8">
              {[...alerts, ...alerts].map((a, i) => (
                <span
                  key={i}
                  className={
                    "text-[12px] font-mono-tel " +
                    (a.severity === "critical" ? "text-[#FF3333] hmi-blink" : "text-[#FFBF00]")
                  }
                >
                  ● {a.title.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HeaderRow({ left, right }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="text-[10px] font-mono-tel tracking-[0.18em] text-[#757575]">{left}</div>
      <div className="text-[10px] font-mono-tel text-[#5A6063]">{right}</div>
    </div>
  );
}

function Metric({ label, value, unit, sub, accent, testid }) {
  const color =
    accent === "critical" ? "text-[#FF3333]" :
    accent === "warning"  ? "text-[#FFBF00]" : "text-[#E2E2E2]";
  return (
    <div data-testid={testid}>
      <div className="text-[10px] font-mono-tel tracking-[0.15em] text-[#757575]">{label}</div>
      <div className="flex items-baseline gap-1.5 mt-0.5">
        <span className={`font-mono-tel text-2xl font-semibold ${color}`}>{value}</span>
        <span className="text-[11px] font-mono-tel text-[#757575]">{unit}</span>
      </div>
      {sub && (
        <div className={`text-[10px] font-mono-tel mt-0.5 ${color === "text-[#E2E2E2]" ? "text-[#5A6063]" : color}`}>
          {sub}
        </div>
      )}
    </div>
  );
}
