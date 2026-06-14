import { atr, rollingHigh } from "../core/indicators.js";

export const donchian = {
  id: "donchian",
  name: "Donchian 단순 돌파",
  description: "비교 기준용으로 20봉 최고가 돌파를 매수하고 ATR 손절과 10봉 최저가로 청산합니다.",
  defaults: { breakoutPeriod: 20, exitPeriod: 10, riskPct: 0.005, maxAllocationPct: 0.3, atrStop: 2, maxHoldBars: 192 },
  prepare(candles, params) {
    return {
      atr14: atr(candles, 14),
      high: rollingHigh(candles.map((c) => c.high), params.breakoutPeriod),
      low: candles.map((_, index) => {
        if (index < params.exitPeriod) return null;
        return Math.min(...candles.slice(index - params.exitPeriod, index).map((c) => c.low));
      }),
    };
  },
  createRuntime() { return {}; },
  onFlat({ index, candles, data }) {
    if (data.high[index] && candles[index].close > data.high[index]) {
      return { type: "entry", executeAt: index + 1, atr: data.atr14[index], reason: "20봉 최고가 돌파" };
    }
    return null;
  },
  buildEntry({ signal, openPrice, equity, params }) {
    if (!signal.atr) return null;
    const stop = openPrice - (params.atrStop * signal.atr);
    const quantity = Math.min(
      (equity * params.riskPct) / (openPrice - stop),
      (equity * params.maxAllocationPct) / openPrice,
    );
    return { quantity, stop, initialStop: stop, riskPerUnit: openPrice - stop, target: Infinity, partialTarget: Infinity };
  },
  onPosition({ index, candles, data, position, params }) {
    if (data.low[index] && candles[index].close < data.low[index]) return { type: "exit", price: candles[index].close, reason: "10봉 최저가 이탈" };
    if (index - position.entryIndex >= params.maxHoldBars) return { type: "exit", price: candles[index].close, reason: "최대 보유시간 48시간" };
    return null;
  },
};
