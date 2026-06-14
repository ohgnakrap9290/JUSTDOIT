import test from "node:test";
import assert from "node:assert/strict";
import { runBacktest } from "../src/core/engine.js";

const candles = Array.from({ length: 600 }, (_, index) => {
  const price = 100 + (index * 0.1);
  return { time: index * 900_000, open: price, high: price + 1, low: price - 1, close: price + 0.5, volume: 10, value: 1_000 };
});

test("engine applies fees and completes a synthetic trade", async () => {
  const strategy = {
    id: "test",
    name: "test",
    defaults: { partialPct: 0 },
    prepare: () => ({}),
    createRuntime: () => ({}),
    onFlat: ({ index }) => index === 10 ? { type: "entry", executeAt: 11, reason: "test" } : null,
    buildEntry: ({ openPrice }) => ({
      quantity: 100,
      stop: openPrice - 10,
      initialStop: openPrice - 10,
      riskPerUnit: 10,
      partialTarget: Infinity,
      target: openPrice + 5,
    }),
    onPosition: () => null,
  };
  const result = await runBacktest({ candles, strategy, initialCapital: 100_000, feeRate: 0.001, slippageRate: 0, yieldEvery: 0 });
  assert.equal(result.metrics.trades, 1);
  assert.equal(result.metrics.wins, 1);
  assert.ok(result.metrics.feesPaid > 0);
  assert.ok(result.metrics.finalEquity > 100_000);
});

test("engine rejects too little data", async () => {
  await assert.rejects(() => runBacktest({ candles: candles.slice(0, 100), strategy: {} }), /최소 500개/);
});
