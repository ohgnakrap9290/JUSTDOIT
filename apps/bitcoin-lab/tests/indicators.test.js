import test from "node:test";
import assert from "node:assert/strict";
import { aggregateCandles } from "../src/core/indicators.js";

test("4-hour aggregation aligns to UTC boundaries", () => {
  const interval = 15 * 60 * 1000;
  const start = Date.UTC(2026, 0, 1, 0, 0);
  const candles = Array.from({ length: 32 }, (_, index) => ({
    time: start + (index * interval),
    open: index,
    high: index + 1,
    low: index - 1,
    close: index + 0.5,
    volume: 1,
  }));
  const result = aggregateCandles(candles, 16);
  assert.equal(result.groups.length, 2);
  assert.equal(new Date(result.groups[0].time).getUTCHours(), 0);
  assert.equal(new Date(result.groups[1].time).getUTCHours(), 4);
  assert.equal(result.sourceIndex[0], 0);
  assert.equal(result.sourceIndex[31], 1);
});
