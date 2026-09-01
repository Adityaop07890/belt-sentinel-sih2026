import React from "react";
import { SPLICE_IMAGES } from "@/lib/scenarios";

export default function VisionPanel({ snapshot }) {
  const detection = snapshot.cnn_detection;
  const isCritical = !!detection;

  const img = isCritical ? SPLICE_IMAGES.damaged : SPLICE_IMAGES.clean;
  const label = isCritical ? `${detection.label} · ${(detection.confidence * 100).toFixed(0)}% conf.` : "Nominal";
  const joint = isCritical ? detection.joint : "J1";
  const timestamp = new Date().toISOString().slice(11, 19);

  const bbox = detection?.bbox;

  return (
    <div
      data-testid="vision-panel"
      className="border border-[#252729] bg-[#1A1C1E] card-in flex flex-col h-full"
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[#252729]">
        <div className="text-[10px] font-mono-tel tracking-[0.18em] text-[#757575]">
          ESP32-CAM · CNN VISION FEED
        </div>
        <div className="text-[10px] font-mono-tel text-[#5A6063]">
          FRAME @ {timestamp}Z
        </div>
      </div>

      <div className="relative aspect-video crt-scanlines overflow-hidden">
        <img
          src={img}
          alt="Splice camera feed"
          className="w-full h-full object-cover"
        />
        {/* CNN bounding box */}
        {bbox && (
          <div
            className="absolute border-2 border-[#FF3333]"
            style={{
              left:  `${bbox.x * 100}%`,
              top:   `${bbox.y * 100}%`,
              width: `${bbox.w * 100}%`,
              height:`${bbox.h * 100}%`,
              boxShadow: "0 0 0 1px rgba(255,51,51,0.4), 0 0 12px rgba(255,51,51,0.35) inset",
            }}
            data-testid="vision-bbox"
          >
            <div className="absolute -top-5 left-0 bg-[#FF3333] text-[10px] font-mono-tel text-black px-1.5 py-[1px]">
              {label}
            </div>
          </div>
        )}
        {/* radar sweep line */}
        <div className="absolute inset-x-0 h-[2px] bg-gradient-to-b from-transparent via-[#4A90E2]/40 to-transparent sweep-line pointer-events-none" />
        {/* overlay meta */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-mono-tel text-[#E2E2E2] bg-black/40 px-2 py-1">
          <span>JOINT {joint}</span>
          <span className={isCritical ? "text-[#FF3333]" : "text-[#5A6063]"}>
            {isCritical ? "● DEFECT DETECTED" : "○ NOMINAL"}
          </span>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-[#252729] grid grid-cols-3 gap-3">
        <MetaCell label="MODEL" value="CNN v0.4-mob" />
        <MetaCell label="INFER" value="128 ms" />
        <MetaCell label="LAT."  value="edge" />
      </div>
    </div>
  );
}

function MetaCell({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] font-mono-tel tracking-[0.15em] text-[#757575]">{label}</span>
      <span className="text-[12px] font-mono-tel text-[#E2E2E2]">{value}</span>
    </div>
  );
}
