const ALLOWED_UNITS = new Set(["1", "3", "5", "10", "15", "30", "60", "240"]);

export default async function handler(request, response) {
  const market = String(request.query.market || "KRW-BTC");
  const unit = String(request.query.unit || "15");
  const count = Math.min(200, Math.max(1, Number(request.query.count || 200)));
  const to = request.query.to ? String(request.query.to) : "";

  if (!/^KRW-[A-Z0-9]+$/.test(market) || !ALLOWED_UNITS.has(unit)) {
    return response.status(400).json({ error: "invalid_request" });
  }

  const params = new URLSearchParams({ market, count: String(count) });
  if (to) params.set("to", to);

  try {
    const upstream = await fetch(`https://api.upbit.com/v1/candles/minutes/${unit}?${params}`, {
      headers: { Accept: "application/json", "User-Agent": "BitcoinStrategyLab/1.0" },
    });
    const data = await upstream.json();
    response.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=3600");
    return response.status(upstream.status).json(data);
  } catch (error) {
    return response.status(502).json({ error: "upstream_unavailable", message: error.message });
  }
}
