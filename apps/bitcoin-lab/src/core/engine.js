function round(value, digits = 2) {
  return Number(Number(value).toFixed(digits));
}

function calculateDrawdown(equityCurve) {
  let peak = -Infinity;
  let maximum = 0;
  equityCurve.forEach((point) => {
    peak = Math.max(peak, point.equity);
    maximum = Math.max(maximum, peak > 0 ? (peak - point.equity) / peak : 0);
  });
  return maximum;
}

function calculateSharpe(equityCurve, barsPerYear = 35_040) {
  if (equityCurve.length < 3) return 0;
  const returns = [];
  for (let index = 1; index < equityCurve.length; index += 1) {
    const previous = equityCurve[index - 1].equity;
    if (previous > 0) returns.push((equityCurve[index].equity - previous) / previous);
  }
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / Math.max(1, returns.length - 1);
  const deviation = Math.sqrt(variance);
  return deviation ? (mean / deviation) * Math.sqrt(barsPerYear) : 0;
}

function summarize({ candles, initialCapital, cash, position, trades, equityCurve, feesPaid }) {
  const finalEquity = cash + (position ? position.quantity * candles.at(-1).close : 0);
  const wins = trades.filter((trade) => trade.pnl > 0);
  const losses = trades.filter((trade) => trade.pnl <= 0);
  const grossProfit = wins.reduce((sum, trade) => sum + trade.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.pnl, 0));
  const days = Math.max(1, (candles.at(-1).time - candles[0].time) / 86_400_000);
  const years = days / 365.25;
  const totalReturn = (finalEquity / initialCapital) - 1;
  const buyHoldReturn = (candles.at(-1).close / candles[0].close) - 1;
  return {
    initialCapital: round(initialCapital),
    finalEquity: round(finalEquity),
    totalReturn: round(totalReturn * 100, 3),
    cagr: round(((finalEquity / initialCapital) ** (1 / Math.max(years, 1 / 365.25)) - 1) * 100, 3),
    buyHoldReturn: round(buyHoldReturn * 100, 3),
    maxDrawdown: round(calculateDrawdown(equityCurve) * 100, 3),
    sharpe: round(calculateSharpe(equityCurve), 3),
    trades: trades.length,
    wins: wins.length,
    losses: losses.length,
    winRate: round((wins.length / Math.max(1, trades.length)) * 100, 2),
    profitFactor: round(grossLoss ? grossProfit / grossLoss : grossProfit > 0 ? 99 : 0, 3),
    averageTrade: round(trades.reduce((sum, trade) => sum + trade.pnl, 0) / Math.max(1, trades.length)),
    averageHoldHours: round(trades.reduce((sum, trade) => sum + trade.holdHours, 0) / Math.max(1, trades.length), 2),
    feesPaid: round(feesPaid),
    start: candles[0].time,
    end: candles.at(-1).time,
  };
}

export async function runBacktest({
  candles,
  strategy,
  parameters = {},
  initialCapital = 10_000_000,
  feeRate = 0.0005,
  slippageRate = 0.0003,
  dailyLossLimit = 0.015,
  maxConsecutiveLosses = 3,
  cooldownBars = 96,
  onProgress = () => {},
  yieldEvery = 400,
}) {
  if (candles.length < 500) throw new Error("백테스트에는 최소 500개 캔들이 필요합니다.");
  const params = { ...strategy.defaults, ...parameters };
  const data = strategy.prepare(candles, params);
  const runtime = strategy.createRuntime();
  const trades = [];
  const equityCurve = [];
  let cash = initialCapital;
  let position = null;
  let pendingEntry = null;
  let feesPaid = 0;
  let consecutiveLosses = 0;
  let cooldownUntil = 0;
  let currentDay = "";
  let dayStartEquity = initialCapital;
  let dailyLocked = false;

  const equityAt = (price) => cash + (position ? position.quantity * price : 0);

  const sell = (quantity, rawPrice, index, reason) => {
    const price = rawPrice * (1 - slippageRate);
    const proceeds = quantity * price;
    const fee = proceeds * feeRate;
    cash += proceeds - fee;
    feesPaid += fee;
    position.quantity -= quantity;
    position.proceeds += proceeds - fee;
    position.exitFills.push({ time: candles[index].time, price, quantity, reason });
  };

  const closePosition = (rawPrice, index, reason) => {
    sell(position.quantity, rawPrice, index, reason);
    const pnl = position.proceeds - position.entryCost;
    const trade = {
      entryTime: candles[position.entryIndex].time,
      exitTime: candles[index].time,
      entryPrice: round(position.entryPrice),
      exitPrice: round(position.exitFills.at(-1).price),
      quantity: position.initialQuantity,
      pnl: round(pnl),
      returnPct: round((pnl / position.entryCost) * 100, 3),
      holdHours: round(((candles[index].time - candles[position.entryIndex].time) / 3_600_000), 2),
      reason,
      partialTaken: position.partialTaken,
      fills: position.exitFills,
    };
    trades.push(trade);
    consecutiveLosses = pnl > 0 ? 0 : consecutiveLosses + 1;
    if (consecutiveLosses >= maxConsecutiveLosses) cooldownUntil = index + cooldownBars;
    position = null;
    runtime.belowEmaCount = 0;
  };

  for (let index = 0; index < candles.length; index += 1) {
    const candle = candles[index];
    const day = new Date(candle.time).toISOString().slice(0, 10);
    if (day !== currentDay) {
      currentDay = day;
      dayStartEquity = equityAt(candle.open);
      dailyLocked = false;
    }

    if (!position && pendingEntry?.executeAt === index && !dailyLocked && index >= cooldownUntil) {
      const entryPrice = candle.open * (1 + slippageRate);
      const specification = strategy.buildEntry({
        signal: pendingEntry,
        openPrice: entryPrice,
        equity: equityAt(candle.open),
        params,
      });
      if (specification?.quantity > 0) {
        const affordable = cash / (entryPrice * (1 + feeRate));
        const quantity = Math.min(specification.quantity, affordable);
        const notional = quantity * entryPrice;
        const fee = notional * feeRate;
        if (quantity > 0 && notional >= 5_000) {
          cash -= notional + fee;
          feesPaid += fee;
          position = {
            ...specification,
            entryIndex: index,
            entryPrice,
            quantity,
            initialQuantity: quantity,
            entryCost: notional + fee,
            proceeds: 0,
            highest: candle.high,
            partialTaken: false,
            exitFills: [],
            entryReason: pendingEntry.reason,
          };
        }
      }
      pendingEntry = null;
    }

    if (position) {
      position.highest = Math.max(position.highest, candle.high);
      if (candle.low <= position.stop) {
        closePosition(position.stop, index, "손절 또는 추적 손절");
      } else if (position) {
        if (!position.partialTaken && candle.high >= position.partialTarget) {
          const partialQuantity = position.quantity * (params.partialPct ?? 0);
          if (partialQuantity > 0) {
            sell(partialQuantity, position.partialTarget, index, "1R 부분 익절");
            position.partialTaken = true;
            position.stop = Math.max(position.stop, position.entryPrice);
          }
        }
        if (position && candle.high >= position.target) {
          closePosition(position.target, index, "최종 목표가");
        } else if (position) {
          const signal = strategy.onPosition({ index, candles, data, runtime, position, params });
          if (signal?.type === "exit") closePosition(signal.price, index, signal.reason);
        }
      }
    }

    const equity = equityAt(candle.close);
    if ((equity / dayStartEquity) - 1 <= -dailyLossLimit) dailyLocked = true;

    if (!position && !pendingEntry && !dailyLocked && index >= cooldownUntil) {
      const signal = strategy.onFlat({ index, candles, data, runtime, params });
      if (signal?.type === "entry" && signal.executeAt < candles.length) pendingEntry = signal;
    }

    equityCurve.push({
      time: candle.time,
      equity: round(equity),
      price: candle.close,
      drawdown: 0,
    });

    if (index % 100 === 0 || index === candles.length - 1) {
      const interim = summarize({ candles: candles.slice(0, index + 1), initialCapital, cash, position, trades, equityCurve, feesPaid });
      onProgress({
        phase: "backtest",
        progress: Math.round(((index + 1) / candles.length) * 100),
        processed: index + 1,
        total: candles.length,
        currentTime: candle.time,
        metrics: interim,
        lastTrade: trades.at(-1) || null,
      });
    }
    if (yieldEvery && index % yieldEvery === 0) await new Promise((resolve) => setTimeout(resolve, 0));
  }

  if (position) closePosition(candles.at(-1).close, candles.length - 1, "백테스트 종료");
  let peak = 0;
  equityCurve.forEach((point) => {
    peak = Math.max(peak, point.equity);
    point.drawdown = peak ? round(((point.equity / peak) - 1) * 100, 3) : 0;
  });
  const metrics = summarize({ candles, initialCapital, cash, position, trades, equityCurve, feesPaid });
  return { metrics, trades, equityCurve, parameters: params, strategy: { id: strategy.id, name: strategy.name } };
}
