const UPBIT_BASE = "https://api.upbit.com/v1/candles/minutes";

export function normalizeCandle(item) {
  return {
    time: Date.parse(`${item.candle_date_time_utc}Z`),
    open: Number(item.opening_price),
    high: Number(item.high_price),
    low: Number(item.low_price),
    close: Number(item.trade_price),
    volume: Number(item.candle_acc_trade_volume),
    value: Number(item.candle_acc_trade_price),
  };
}

export async function fetchCandles({
  market = "KRW-BTC",
  unit = 15,
  days = 180,
  endpoint = "",
  onProgress = () => {},
  signal,
}) {
  const end = Date.now();
  const start = end - (days * 86_400_000);
  const output = new Map();
  let cursor = "";
  let requests = 0;
  const estimate = Math.ceil((days * 24 * 60 / unit) / 200);

  while (true) {
    const params = new URLSearchParams({ market, unit: String(unit), count: "200" });
    if (cursor) params.set("to", cursor);
    const url = endpoint
      ? `${endpoint}?${params}`
      : `${UPBIT_BASE}/${unit}?market=${market}&count=200${cursor ? `&to=${encodeURIComponent(cursor)}` : ""}`;
    const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`캔들 요청 실패 (${response.status})`);
    const batch = await response.json();
    if (!Array.isArray(batch) || batch.length === 0) break;

    batch.forEach((item) => {
      const candle = normalizeCandle(item);
      if (candle.time >= start && candle.time <= end) output.set(candle.time, candle);
    });
    requests += 1;
    const oldest = normalizeCandle(batch.at(-1));
    onProgress({
      phase: "download",
      progress: Math.min(99, Math.round((requests / estimate) * 100)),
      candles: output.size,
      message: `${output.size.toLocaleString()}개 캔들 수집`,
    });
    if (oldest.time <= start || batch.length < 200) break;
    cursor = new Date(oldest.time - 1).toISOString().replace(".000Z", "Z");
    await new Promise((resolve) => setTimeout(resolve, 115));
  }

  return [...output.values()].sort((a, b) => a.time - b.time);
}
