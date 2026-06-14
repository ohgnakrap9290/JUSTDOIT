import "./styles.css";
import { fetchCandles } from "./core/data.js";
import { strategies, strategyMap } from "./strategies/index.js";

const $ = (selector) => document.querySelector(selector);
let worker = null;
let candles = [];
let latestResult = null;

function formatMoney(value) {
  if (!Number.isFinite(value)) return "—";
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function setProgress(value) {
  const progress = Math.max(0, Math.min(100, value));
  $("#progressValue").textContent = Math.round(progress);
  $("#progressBar").style.width = `${progress}%`;
  $("#progressRing").style.setProperty("--progress", `${progress * 3.6}deg`);
}

function setState(state, title, message) {
  $("#runState").className = `run-state ${state}`;
  $("#runState b").textContent = state === "running" ? "RUNNING" : state === "complete" ? "COMPLETE" : state === "error" ? "ERROR" : "READY";
  $("#runTitle").textContent = title;
  $("#runMessage").textContent = message;
}

function updateMetrics(metrics) {
  if (!metrics) return;
  $("#returnMetric").textContent = formatPercent(metrics.totalReturn);
  $("#returnMetric").className = metrics.totalReturn >= 0 ? "positive" : "negative";
  $("#winRateMetric").textContent = `${metrics.winRate.toFixed(1)}%`;
  $("#tradesMetric").textContent = metrics.trades.toLocaleString("ko-KR");
  $("#drawdownMetric").textContent = `-${Math.abs(metrics.maxDrawdown).toFixed(2)}%`;
  $("#profitFactor").textContent = Number(metrics.profitFactor).toFixed(2);
  $("#sharpeMetric").textContent = Number(metrics.sharpe).toFixed(2);
  $("#holdMetric").textContent = `${metrics.averageHoldHours.toFixed(1)}h`;
}

function pathFor(points, width, height, min, max, key) {
  if (!points.length || max === min) return "";
  return points.map((point, index) => {
    const x = (index / Math.max(1, points.length - 1)) * width;
    const y = height - (((point[key] - min) / (max - min)) * height);
    return `${index ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
}

function renderChart(result) {
  const source = result.equityCurve;
  const stride = Math.max(1, Math.ceil(source.length / 700));
  const points = source.filter((_, index) => index % stride === 0 || index === source.length - 1);
  const firstPrice = points[0].price;
  const initial = result.metrics.initialCapital;
  const normalized = points.map((point) => ({
    ...point,
    benchmark: initial * (point.price / firstPrice),
  }));
  const values = normalized.flatMap((point) => [point.equity, point.benchmark]);
  const min = Math.min(...values) * 0.995;
  const max = Math.max(...values) * 1.005;
  const strategyPath = pathFor(normalized, 900, 260, min, max, "equity");
  const benchmarkPath = pathFor(normalized, 900, 260, min, max, "benchmark");
  $("#equityChart").innerHTML = `
    <defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#55e6b1" stop-opacity=".22"/><stop offset="1" stop-color="#55e6b1" stop-opacity="0"/></linearGradient></defs>
    <path class="grid-line" d="M0 65H900M0 130H900M0 195H900M0 260H900"/>
    <path class="area" d="${strategyPath} L900,260 L0,260 Z"/>
    <path class="benchmark" d="${benchmarkPath}"/>
    <path class="strategy" d="${strategyPath}"/>`;
  $("#chartEmpty").hidden = true;
  $("#equityChart").classList.add("visible");
}

function renderTrades(trades) {
  $("#tradeCount").textContent = `${trades.length} TRADES`;
  const rows = trades.slice(-8).reverse();
  $("#tradeRows").innerHTML = rows.length ? rows.map((trade) => `
    <div class="trade-row">
      <span>${new Date(trade.entryTime).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
      <span>${trade.holdHours.toFixed(1)}h</span>
      <span>${trade.reason}</span>
      <b class="${trade.pnl >= 0 ? "positive" : "negative"}">${trade.pnl >= 0 ? "+" : ""}${formatMoney(trade.pnl)}</b>
    </div>`).join("") : "<p>완료된 거래가 없습니다.</p>";
}

function resetResult() {
  latestResult = null;
  setProgress(0);
  updateMetrics({ totalReturn: 0, winRate: 0, trades: 0, maxDrawdown: 0, profitFactor: 0, sharpe: 0, averageHoldHours: 0 });
  ["returnMetric", "winRateMetric", "tradesMetric", "drawdownMetric", "profitFactor", "sharpeMetric", "holdMetric"].forEach((id) => {
    $(`#${id}`).textContent = "—";
  });
  $("#chartEmpty").hidden = false;
  $("#equityChart").classList.remove("visible");
  $("#equityChart").innerHTML = "";
  renderTrades([]);
}

function setRunning(running) {
  $("#runButton").hidden = running;
  $("#stopButton").hidden = !running;
  [...document.querySelectorAll("input, select")].forEach((element) => { element.disabled = running; });
}

async function startBacktest() {
  resetResult();
  setRunning(true);
  const strategyId = $("#strategySelect").value;
  const days = Number($("#daysInput").value);
  const controller = new AbortController();
  window.__backtestAbort = controller;
  setState("running", "시장 데이터를 불러오는 중", "업비트에서 15분봉을 시간 역순으로 수집하고 있습니다.");

  try {
    const endpoint = "/api/candles";
    candles = await fetchCandles({
      days,
      endpoint,
      signal: controller.signal,
      onProgress: (progress) => {
        setProgress(progress.progress * 0.35);
        $("#runMessage").textContent = `${progress.message} · 요청 진행 ${progress.progress}%`;
      },
    });
    if (candles.length < 500) throw new Error("수집된 데이터가 부족합니다.");
    $("#headerPrice").textContent = `${Math.round(candles.at(-1).close).toLocaleString("ko-KR")} KRW`;
    setState("running", "전략을 시뮬레이션하는 중", `${candles.length.toLocaleString()}개 봉에서 체결과 위험관리를 계산합니다.`);

    worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
    worker.onmessage = ({ data }) => {
      if (data.type === "progress") {
        const progress = data.payload;
        setProgress(35 + (progress.progress * 0.65));
        updateMetrics(progress.metrics);
        $("#runMessage").textContent = `${new Date(progress.currentTime).toLocaleDateString("ko-KR")} 처리 · ${progress.processed.toLocaleString()} / ${progress.total.toLocaleString()}봉`;
      }
      if (data.type === "complete") {
        latestResult = data.payload;
        setProgress(100);
        updateMetrics(latestResult.metrics);
        renderChart(latestResult);
        renderTrades(latestResult.trades);
        setState("complete", "백테스트가 완료됐습니다", `${latestResult.metrics.trades}개 거래 · 최종 자산 ${formatMoney(latestResult.metrics.finalEquity)}`);
        setRunning(false);
        worker.terminate();
        worker = null;
      }
      if (data.type === "error") {
        setState("error", "계산 중 오류가 발생했습니다", data.payload.message);
        setRunning(false);
        worker?.terminate();
        worker = null;
      }
    };
    worker.onerror = (event) => {
      setState("error", "계산 중 오류가 발생했습니다", event.message);
      setRunning(false);
    };
    worker.postMessage({
      candles,
      strategyId,
      settings: {
        initialCapital: Number($("#capitalInput").value),
        feeRate: Number($("#feeInput").value) / 100,
        slippageRate: Number($("#slippageInput").value) / 100,
        dailyLossLimit: Number($("#dailyLossInput").value) / 100,
        maxConsecutiveLosses: Number($("#lossesInput").value),
      },
    });
  } catch (error) {
    if (error.name === "AbortError") setState("idle", "실행이 중지됐습니다", "조건을 변경한 뒤 다시 시작할 수 있습니다.");
    else setState("error", "백테스트를 시작하지 못했습니다", error.message);
    setRunning(false);
  }
}

function updateStrategy() {
  const strategy = strategyMap[$("#strategySelect").value];
  $("#strategyDescription").textContent = strategy.description;
}

$("#strategySelect").innerHTML = strategies.map((strategy) => `<option value="${strategy.id}">${strategy.name}</option>`).join("");
updateStrategy();
$("#strategySelect").addEventListener("change", updateStrategy);
$("#runButton").addEventListener("click", startBacktest);
$("#stopButton").addEventListener("click", () => {
  window.__backtestAbort?.abort();
  worker?.terminate();
  worker = null;
  setRunning(false);
  setState("idle", "실행이 중지됐습니다", "조건을 변경한 뒤 다시 시작할 수 있습니다.");
});
$("#methodButton").addEventListener("click", () => $("#methodDrawer").classList.add("active"));
document.querySelectorAll("[data-close-method]").forEach((button) => button.addEventListener("click", () => $("#methodDrawer").classList.remove("active")));
resetResult();

if (["localhost", "127.0.0.1"].includes(location.hostname)) {
  window.__bitlab = { startBacktest, get result() { return latestResult; } };
}
