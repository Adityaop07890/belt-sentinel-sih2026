import React, { useState } from "react";
import { streamRecommendation } from "@/lib/api";
import { ChevronDown, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AlertPanel({ snapshot }) {
  const alerts = snapshot.alerts || [];

  return (
    <div
      data-testid="alert-panel"
      className="border border-[#252729] bg-[#1A1C1E] card-in flex flex-col h-full"
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[#252729]">
        <div className="text-[10px] font-mono-tel tracking-[0.18em] text-[#757575]">
          EXPLAINABLE-AI ALERTS
        </div>
        <div className="text-[10px] font-mono-tel text-[#5A6063]">
          MULTIMODAL FUSION
        </div>
      </div>

      <div className="p-3 space-y-2 overflow-y-auto flex-1">
        {alerts.length === 0 ? (
          <div className="text-[12px] font-mono-tel text-[#5A6063] py-6 text-center" data-testid="alerts-empty">
            No active anomalies. All splice joints are within nominal thresholds.
          </div>
        ) : (
          alerts.map((a) => (
            <AlertCard key={a.id} alert={a} scenario={snapshot.scenario} />
          ))
        )}
      </div>
    </div>
  );
}

function AlertCard({ alert, scenario }) {
  const [open, setOpen] = useState(true);
  const [rec, setRec] = useState("");
  const [loading, setLoading] = useState(false);

  const isCritical = alert.severity === "critical";
  const border = isCritical ? "border-[#FF3333]" : "border-[#FFBF00]";
  const badgeBg = isCritical ? "bg-[#FF3333]" : "bg-[#FFBF00]";

  const runRec = async () => {
    setRec(""); setLoading(true);
    try {
      await streamRecommendation(
        { scenario, alert_id: alert.id },
        (chunk) => setRec((r) => r + chunk),
      );
    } catch (e) {
      toast.error("Could not generate recommendation");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const ev = alert.evidence;

  return (
    <div
      data-testid={`alert-card-${alert.id}`}
      className={`border ${border} border-l-2 bg-[#1F1A1A]`}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-[9px] font-mono-tel text-black px-1.5 py-[1px] ${badgeBg}`}>
            {alert.severity.toUpperCase()}
          </span>
          <span className="text-[12.5px] text-[#E2E2E2] truncate">{alert.title}</span>
        </div>
        <ChevronDown size={14}
                     className={`text-[#757575] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3">
          <div className="text-[12px] text-[#A0A0A0]">{alert.summary}</div>

          <div className="grid grid-cols-3 gap-2 text-[11px] font-mono-tel">
            <EvidenceCell label="VIBRATION"
                          value={ev.vibration.value + " " + ev.vibration.unit}
                          sub={ev.vibration.delta} />
            <EvidenceCell label="THERMAL"
                          value={ev.thermal.value + " " + ev.thermal.unit}
                          sub={ev.thermal.delta} />
            <EvidenceCell label="VISION"
                          value={ev.vision.confidence
                                 ? `${(ev.vision.confidence * 100).toFixed(0)}% conf.`
                                 : "Nominal"}
                          sub={ev.vision.status} />
          </div>

          <div className="text-[11px] text-[#A0A0A0] border-t border-[#252729] pt-2">
            <span className="text-[#5A6063]">SYSTEM REC:</span> {alert.recommendation}
          </div>

          <div>
            <button
              onClick={runRec}
              disabled={loading}
              data-testid={`ai-recommend-${alert.id}`}
              className="inline-flex items-center gap-2 border border-[#4A90E2] text-[#4A90E2] hover:bg-[#4A90E2]/10 px-3 py-1.5 text-[11px] font-mono-tel tracking-wide disabled:opacity-60"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              {loading ? "GENERATING..." : "AI MAINTENANCE PLAN (Claude Sonnet 4.6)"}
            </button>
            {rec && (
              <pre
                data-testid={`ai-recommend-output-${alert.id}`}
                className="mt-2 whitespace-pre-wrap text-[11.5px] leading-relaxed text-[#E2E2E2] bg-[#121416] border border-[#252729] p-3 font-mono-tel"
              >
                {rec}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EvidenceCell({ label, value, sub }) {
  return (
    <div className="border border-[#252729] px-2 py-1.5">
      <div className="text-[9px] tracking-[0.15em] text-[#757575]">{label}</div>
      <div className="text-[12px] text-[#E2E2E2]">{value}</div>
      {sub && <div className="text-[9.5px] text-[#5A6063]">{sub}</div>}
    </div>
  );
}
