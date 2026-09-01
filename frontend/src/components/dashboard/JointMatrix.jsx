import React from "react";
import { SPLICE_IMAGES } from "@/lib/scenarios";

export default function JointMatrix({ snapshot }) {
  const joints = snapshot.joints || {};
  const criticalJoint = snapshot.critical_joint;

  return (
    <div
      data-testid="joint-matrix"
      className="border border-[#252729] bg-[#1A1C1E] card-in"
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[#252729]">
        <div className="text-[10px] font-mono-tel tracking-[0.18em] text-[#757575]">
          SPLICE JOINT TRACKING MATRIX
        </div>
        <div className="text-[10px] font-mono-tel text-[#5A6063]">4 JOINTS · J1–J4</div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-0">
        {Object.entries(joints).map(([id, j], idx) => (
          <JointCard
            key={id}
            id={id}
            data={j}
            critical={criticalJoint === id}
            first={idx === 0}
          />
        ))}
      </div>
    </div>
  );
}

function JointCard({ id, data, critical }) {
  const status = data.status; // healthy | warning | critical
  const border =
    status === "critical" ? "border-[#FF3333]" :
    status === "warning"  ? "border-[#FFBF00]" : "border-[#252729]";
  const textColor =
    status === "critical" ? "text-[#FF3333]" :
    status === "warning"  ? "text-[#FFBF00]" : "text-[#5A6063]";
  const dot =
    status === "critical" ? "bg-[#FF3333] hmi-blink" :
    status === "warning"  ? "bg-[#FFBF00]" : "bg-[#5A6063]";

  const thumb = status === "critical" ? SPLICE_IMAGES.damaged : SPLICE_IMAGES.clean;

  return (
    <div
      data-testid={`joint-card-${id}`}
      className={
        `p-4 border-r border-b border-[#252729] last:border-r-0 ` +
        `relative ${critical ? "bg-[#1F1A1A]" : ""} border-l-2 ${border}`
      }
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${dot}`} />
          <span className="text-[13px] font-semibold text-[#E2E2E2]">{id}</span>
          <span className={`text-[10px] font-mono-tel uppercase tracking-wide ${textColor}`}>
            {status}
          </span>
        </div>
        <div className="text-[10px] font-mono-tel text-[#5A6063]">
          {data.lifecycle_months > 0
            ? `~${data.lifecycle_months} mo`
            : "IMMEDIATE"}
        </div>
      </div>

      <div className="mt-3 flex items-end gap-4">
        <div className="flex-1">
          <div className="text-[10px] font-mono-tel text-[#757575]">HEALTH</div>
          <div className={`font-mono-tel text-3xl font-semibold ${textColor === "text-[#5A6063]" ? "text-[#E2E2E2]" : textColor}`}>
            {data.health}
          </div>
          {/* mini bullet bar */}
          <div className="mt-2 h-1.5 bg-[#252729] w-full overflow-hidden">
            <div
              className={
                (status === "critical" ? "bg-[#FF3333]" :
                 status === "warning"  ? "bg-[#FFBF00]" : "bg-[#5A6063]")
              }
              style={{ width: `${data.health}%`, height: "100%" }}
            />
          </div>
        </div>
        <div className="w-16 h-14 border border-[#252729] overflow-hidden relative shrink-0">
          <img
            src={thumb}
            alt={`Splice ${id}`}
            className="w-full h-full object-cover opacity-80"
          />
          {status === "critical" && (
            <div className="absolute inset-1 border border-[#FF3333] pointer-events-none" />
          )}
        </div>
      </div>

      {data.anomaly && (
        <div className="mt-3 text-[11px] leading-snug text-[#A0A0A0] font-mono-tel">
          <span className={textColor}>▶</span> {data.anomaly}
        </div>
      )}
    </div>
  );
}
