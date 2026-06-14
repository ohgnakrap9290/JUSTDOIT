export function ema(values, period) {
  const output = Array(values.length).fill(null);
  if (values.length < period) return output;
  const multiplier = 2 / (period + 1);
  let seed = 0;
  for (let i = 0; i < period; i += 1) seed += values[i];
  output[period - 1] = seed / period;
  for (let i = period; i < values.length; i += 1) {
    output[i] = ((values[i] - output[i - 1]) * multiplier) + output[i - 1];
  }
  return output;
}

export function sma(values, period) {
  const output = Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) output[i] = sum / period;
  }
  return output;
}

export function atr(candles, period = 14) {
  const ranges = candles.map((candle, index) => {
    if (index === 0) return candle.high - candle.low;
    const previous = candles[index - 1].close;
    return Math.max(candle.high - candle.low, Math.abs(candle.high - previous), Math.abs(candle.low - previous));
  });
  const output = Array(candles.length).fill(null);
  if (ranges.length < period) return output;
  let value = ranges.slice(0, period).reduce((sum, range) => sum + range, 0) / period;
  output[period - 1] = value;
  for (let i = period; i < ranges.length; i += 1) {
    value = ((value * (period - 1)) + ranges[i]) / period;
    output[i] = value;
  }
  return output;
}

export function rsi(values, period = 14) {
  const output = Array(values.length).fill(null);
  if (values.length <= period) return output;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i += 1) {
    const change = values[i] - values[i - 1];
    gains += Math.max(change, 0);
    losses += Math.max(-change, 0);
  }
  let averageGain = gains / period;
  let averageLoss = losses / period;
  output[period] = averageLoss === 0 ? 100 : 100 - (100 / (1 + (averageGain / averageLoss)));
  for (let i = period + 1; i < values.length; i += 1) {
    const change = values[i] - values[i - 1];
    averageGain = ((averageGain * (period - 1)) + Math.max(change, 0)) / period;
    averageLoss = ((averageLoss * (period - 1)) + Math.max(-change, 0)) / period;
    output[i] = averageLoss === 0 ? 100 : 100 - (100 / (1 + (averageGain / averageLoss)));
  }
  return output;
}

export function rollingHigh(values, period) {
  return values.map((_, index) => {
    if (index < period) return null;
    let high = -Infinity;
    for (let i = index - period; i < index; i += 1) high = Math.max(high, values[i]);
    return high;
  });
}

export function aggregateCandles(candles, size) {
  const groups = [];
  const sourceIndex = Array(candles.length).fill(null);
  if (candles.length < 2) return { groups, sourceIndex };
  const interval = candles[1].time - candles[0].time;
  const bucketSize = interval * size;
  const buckets = new Map();
  candles.forEach((candle, index) => {
    const bucket = Math.floor(candle.time / bucketSize) * bucketSize;
    if (!buckets.has(bucket)) buckets.set(bucket, []);
    buckets.get(bucket).push({ candle, index });
  });
  for (const [bucket, entries] of buckets) {
    if (entries.length !== size) continue;
    const slice = entries.map((entry) => entry.candle);
    const group = {
      time: bucket,
      open: slice[0].open,
      high: Math.max(...slice.map((c) => c.high)),
      low: Math.min(...slice.map((c) => c.low)),
      close: slice.at(-1).close,
      volume: slice.reduce((sum, c) => sum + c.volume, 0),
    };
    const groupIndex = groups.push(group) - 1;
    entries.forEach((entry) => { sourceIndex[entry.index] = groupIndex; });
  }
  return { groups, sourceIndex };
}
