import { aggregateCandles, atr, ema, rollingHigh, rsi, sma } from "../core/indicators.js";

export const pullbackBreakout = {
  id: "pullback-breakout",
  name: "추세 돌파 후 눌림목",
  description: "4시간 상승 추세에서 거래량을 동반한 15분 돌파 후 눌림목을 매수합니다.",
  defaults: {
    breakoutPeriod: 20,
    volumeMultiplier: 1.3,
    pullbackWindow: 8,
    atrMinimumPct: 0.0025,
    riskPct: 0.005,
    maxAllocationPct: 0.3,
    atrStop: 1.5,
    targetR: 2.5,
    partialR: 1,
    partialPct: 0.4,
    maxHoldBars: 144,
  },
  prepare(candles, params) {
    const closes = candles.map((c) => c.close);
    const highs = candles.map((c) => c.high);
    const volumes = candles.map((c) => c.volume);
    const fourHour = aggregateCandles(candles, 16);
    const fourCloses = fourHour.groups.map((c) => c.close);
    return {
      ema20: ema(closes, 20),
      atr14: atr(candles, 14),
      rsi14: rsi(closes, 14),
      volume20: sma(volumes, 20),
      breakoutHigh: rollingHigh(highs, params.breakoutPeriod),
      fourHour,
      fourEma50: ema(fourCloses, 50),
      fourEma200: ema(fourCloses, 200),
    };
  },
  createRuntime() {
    return { setup: null, belowEmaCount: 0 };
  },
  trendAllowed(index, data) {
    const group = data.fourHour.sourceIndex[index];
    if (group == null || group < 203) return false;
    const candle = data.fourHour.groups[group];
    const fast = data.fourEma50[group];
    const slow = data.fourEma200[group];
    return candle.close > slow && fast > slow && fast > data.fourEma50[group - 3];
  },
  onFlat({ index, candles, data, runtime, params }) {
    const candle = candles[index];
    if (!data.atr14[index] || !data.volume20[index] || !data.breakoutHigh[index]) return null;

    const breakout = this.trendAllowed(index, data)
      && candle.close > data.breakoutHigh[index]
      && candle.volume > data.volume20[index] * params.volumeMultiplier
      && data.atr14[index] / candle.close >= params.atrMinimumPct;

    if (breakout) {
      runtime.setup = {
        expires: index + params.pullbackWindow,
        breakoutPrice: data.breakoutHigh[index],
        lowest: candle.low,
      };
      return null;
    }

    if (!runtime.setup) return null;
    if (index > runtime.setup.expires || !this.trendAllowed(index, data)) {
      runtime.setup = null;
      return null;
    }
    runtime.setup.lowest = Math.min(runtime.setup.lowest, candle.low);
    const touched = candle.low <= Math.max(data.ema20[index], runtime.setup.breakoutPrice) * 1.002;
    const reclaimed = candle.close >= runtime.setup.breakoutPrice && candle.close > candle.open;
    const momentum = data.rsi14[index] >= 50 && data.rsi14[index] <= 72;
    if (!touched || !reclaimed || !momentum) return null;

    const signal = {
      type: "entry",
      executeAt: index + 1,
      atr: data.atr14[index],
      structureLow: runtime.setup.lowest,
      reason: "돌파 후 눌림목 회복",
    };
    runtime.setup = null;
    return signal;
  },
  buildEntry({ signal, openPrice, equity, params }) {
    const rawStop = Math.max(signal.structureLow - (0.2 * signal.atr), openPrice - (params.atrStop * signal.atr));
    const stopPct = (openPrice - rawStop) / openPrice;
    if (stopPct < 0.004 || stopPct > 0.018) return null;
    const riskCash = equity * params.riskPct;
    const quantityByRisk = riskCash / (openPrice - rawStop);
    const quantityByAllocation = (equity * params.maxAllocationPct) / openPrice;
    const quantity = Math.min(quantityByRisk, quantityByAllocation);
    return {
      quantity,
      stop: rawStop,
      initialStop: rawStop,
      riskPerUnit: openPrice - rawStop,
      target: openPrice + ((openPrice - rawStop) * params.targetR),
      partialTarget: openPrice + ((openPrice - rawStop) * params.partialR),
    };
  },
  onPosition({ index, candles, data, runtime, position, params }) {
    const candle = candles[index];
    runtime.belowEmaCount = candle.close < data.ema20[index] ? runtime.belowEmaCount + 1 : 0;
    const trail = position.highest - (2 * data.atr14[index]);
    if (position.partialTaken) position.stop = Math.max(position.stop, position.entryPrice, trail);
    if (runtime.belowEmaCount >= 2) return { type: "exit", price: candle.close, reason: "EMA20 아래 2개 봉" };
    if (index - position.entryIndex >= params.maxHoldBars) return { type: "exit", price: candle.close, reason: "최대 보유시간 36시간" };
    return null;
  },
};
