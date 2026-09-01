import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API, timeout: 15000 });

export const fetchScenarios     = () => api.get("/scenarios").then(r => r.data);
export const fetchSnapshot      = (scenario) =>
  api.get("/dashboard/snapshot", { params: { scenario } }).then(r => r.data);
export const fetchTimeseries    = (scenario, points = 60) =>
  api.get("/dashboard/timeseries", { params: { scenario, points } }).then(r => r.data);

/**
 * Stream a maintenance recommendation from the LLM.
 * onDelta receives text chunks; returns a promise that resolves when the stream ends.
 */
export async function streamRecommendation({ scenario, alert_id }, onDelta, signal) {
  const res = await fetch(`${API}/ai/recommendation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario, alert_id }),
    signal,
  });
  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => "");
    throw new Error(`LLM stream failed: ${res.status} ${t}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return;
      if (payload.startsWith("[ERROR]")) throw new Error(payload);
      onDelta(payload.replace(/\\n/g, "\n"));
    }
  }
}
