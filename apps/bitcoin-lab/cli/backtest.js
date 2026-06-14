import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fetchCandles } from "../src/core/data.js";
import { runBacktest } from "../src/core/engine.js";
import { strategyMap } from "../src/strategies/index.js";

const args = Object.fromEntries(process.argv.slice(2).map((item) => {
  const [key, value = "true"] = item.replace(/^--/, "").split("=");
  return [key, value];
}));
const days = Number(args.days || 180);
const strategyId = args.strategy || "pullback-breakout";
const strategy = strategyMap[strategyId];
if (!strategy) throw new Error(`Unknown strategy: ${strategyId}`);

const cacheDirectory = resolve("data");
const resultDirectory = resolve("results");
const cacheFile = resolve(cacheDirectory, `KRW-BTC-15m-${days}d.json`);
await mkdir(cacheDirectory, { recursive: true });
await mkdir(resultDirectory, { recursive: true });

let candles;
if (existsSync(cacheFile) && args.refresh !== "true") {
  candles = JSON.parse(await readFile(cacheFile, "utf8"));
  console.log(`cache: ${candles.length.toLocaleString()} candles`);
} else {
  candles = await fetchCandles({
    days,
    onProgress: ({ progress, candles: count }) => process.stdout.write(`\rdownload ${progress}% · ${count.toLocaleString()} candles`),
  });
  process.stdout.write("\n");
  await writeFile(cacheFile, JSON.stringify(candles));
}

const result = await runBacktest({
  candles,
  strategy,
  onProgress: ({ progress, metrics }) => {
    process.stdout.write(`\rbacktest ${progress}% · trades ${metrics.trades} · win ${metrics.winRate}% · return ${metrics.totalReturn}%`);
  },
  yieldEvery: 0,
});
process.stdout.write("\n");
const output = resolve(resultDirectory, `${strategyId}-${days}d-${Date.now()}.json`);
await writeFile(output, JSON.stringify(result, null, 2));
console.table(result.metrics);
console.log(`saved: ${output}`);
