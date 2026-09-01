import React from "react";
import { SCENARIOS } from "@/lib/scenarios";
import { Radio, HardDrive, Cpu, ServerCog } from "lucide-react";

export default function Sidebar({ scenario, onScenarioChange, snapshot }) {
  const sys = snapshot?.system;
  return (
    <aside
      data-testid="sidebar"
      className="w-64 shrink-0 hidden md:flex flex-col border-r border-[#252729] bg-[#1A1C1E]"
    >
      <div className="px-5 pt-5 pb-3 border-b border-[#252729]">
        <div className="text-[10px] font-mono-tel tracking-[0.2em] text-[#757575]">SIH 2026 · PS-26008</div>
        <div className="text-[15px] font-semibold text-[#E2E2E2] mt-1 leading-tight">
          Belt-Sentinel
        </div>
        <div className="text-[11px] text-[#A0A0A0]">AIoT Predictive HMI</div>
      </div>

      {/* Scenario selector */}
      <div className="px-5 pt-5">
        <div className="text-[10px] tracking-[0.18em] font-mono-tel text-[#757575] mb-2">
          DEMO SCENARIO
        </div>
        <ul className="space-y-1">
          {SCENARIOS.map((s) => {
            const active = scenario === s.key;
            return (
              <li key={s.key}>
                <button
                  data-testid={`scenario-${s.key}`}
                  onClick={() => onScenarioChange(s.key)}
                  className={
                    "w-full text-left px-3 py-2 border text-[12.5px] flex items-center justify-between transition-colors " +
                    (active
                      ? "border-[#5A6063] bg-[#252729] text-[#E2E2E2]"
                      : "border-[#252729] text-[#A0A0A0] hover:bg-[#252729] hover:text-[#E2E2E2]")
                  }
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={
                        "inline-block h-1.5 w-1.5 " +
                        (active ? "bg-[#E2E2E2]" : "bg-[#3A3E41]")
                      }
                    />
                    {s.label}
                  </span>
                  <span className="font-mono-tel text-[10px] text-[#757575]">[{s.hotkey}]</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* System status */}
      <div className="px-5 pt-6">
        <div className="text-[10px] tracking-[0.18em] font-mono-tel text-[#757575] mb-2">
          SYSTEM CONNECTIVITY
        </div>
        <StatusRow icon={Cpu} label="Edge node (ESP32)" value={sys?.edge_node ?? "—"} online />
        <StatusRow icon={Radio} label="MQTT broker" value={sys?.mqtt_broker ?? "—"} online />
        <StatusRow icon={HardDrive} label="SD buffer" value={`${sys?.sd_buffer_pct ?? 0}%`} />
        <StatusRow icon={ServerCog} label="Sync" value={`${sys?.sync_pct ?? 0}%`} />
      </div>

      <div className="mt-auto px-5 pb-5 pt-6 border-t border-[#252729]">
        <div className="text-[10px] font-mono-tel text-[#757575] leading-relaxed">
          ISA-101 HMI · ISO 10816-3 severity bands · Multimodal fusion: MPU6050 · MLX90614 · ACS712 · ESP32-CAM
        </div>
      </div>
    </aside>
  );
}

function StatusRow({ icon: Icon, label, value, online }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#252729]/70 last:border-b-0">
      <div className="flex items-center gap-2 text-[11.5px] text-[#A0A0A0]">
        <Icon size={13} className="text-[#5A6063]" />
        {label}
      </div>
      <div className="flex items-center gap-1.5 text-[11px] font-mono-tel text-[#E2E2E2]">
        {online && <span className="h-1.5 w-1.5 bg-[#5A6063] rounded-full dot-pulse" />}
        <span>{value}</span>
      </div>
    </div>
  );
}
