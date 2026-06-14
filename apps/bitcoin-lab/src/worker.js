import { runBacktest } from "./core/engine.js";
import { strategyMap } from "./strategies/index.js";

self.addEventListener("message", async (event) => {
  const { candles, strategyId, settings, parameters } = event.data;
  try {
    const result = await runBacktest({
      candles,
      strategy: strategyMap[strategyId],
      parameters,
      ...settings,
      onProgress: (progress) => self.postMessage({ type: "progress", payload: progress }),
    });
    self.postMessage({ type: "complete", payload: result });
  } catch (error) {
    self.postMessage({ type: "error", payload: { message: error.message, stack: error.stack } });
  }
});
