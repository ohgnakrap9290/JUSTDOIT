import "./styles.css";
import {
  PLAYERS,
  attemptPlacement,
  chooseTriangle,
  createGame,
  gameStats,
  getLines,
  visibleTo,
} from "./engine.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const names = { black: "흑", white: "백", draw: "무승부" };

const ui = {
  board: $("#board"),
  lineLayer: $("#lineLayer"),
  turnMessage: $("#turnMessage"),
  phaseLabel: $("#phaseLabel"),
  roundNumber: $("#roundNumber"),
  startOverlay: $("#startOverlay"),
  passOverlay: $("#passOverlay"),
  choiceOverlay: $("#choiceOverlay"),
  resultOverlay: $("#resultOverlay"),
  rulesDrawer: $("#rulesDrawer"),
  nextPlayerName: $("#nextPlayerName"),
  passStone: $("#passStone"),
  triangleChoices: $("#triangleChoices"),
  toast: $("#toast"),
  insight: $("#insightText"),
};

let game = createGame();
let viewer = "black";
let started = false;
let muted = localStorage.getItem("resonance-muted") === "true";
let audioContext = null;
let outcomeTimer = null;
let pulseTriangle = null;

function playerName(player) {
  return names[player];
}

function point(stone) {
  return { x: 50 + stone.x * 87.5, y: 50 + stone.y * 87.5 };
}

function initializeAudio() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === "suspended") audioContext.resume();
}

function sound(type) {
  if (muted) return;
  initializeAudio();
  const setting = {
    place: [220, 150, 0.08, "sine"],
    fail: [130, 75, 0.18, "sawtooth"],
    clue: [420, 610, 0.15, "sine"],
    score: [330, 820, 0.42, "triangle"],
    forbidden: [105, 85, 0.2, "square"],
    reveal: [250, 390, 0.12, "sine"],
  }[type];
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = setting[3];
  oscillator.frequency.setValueAtTime(setting[0], now);
  oscillator.frequency.exponentialRampToValueAtTime(setting[1], now + setting[2]);
  gain.gain.setValueAtTime(type === "score" ? 0.09 : 0.045, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + setting[2]);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(now + setting[2]);
}

function buildBoard() {
  const fragment = document.createDocumentFragment();
  for (let y = 0; y < 9; y += 1) {
    for (let x = 0; x < 9; x += 1) {
      const cell = document.createElement("button");
      cell.className = "cell";
      cell.dataset.x = x;
      cell.dataset.y = y;
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-label", `${String.fromCharCode(65 + x)}${9 - y}`);
      fragment.append(cell);
    }
  }
  ui.board.append(fragment);

  $(".coordinate-top").innerHTML = "ABCDEFGHI".split("").map((letter) => `<span>${letter}</span>`).join("");
  $(".coordinate-left").innerHTML = Array.from({ length: 9 }, (_, index) => `<span>${9 - index}</span>`).join("");
}

function stoneMarkup(stone, isVisible) {
  if (!isVisible) return "";
  const lifeLabel = stone.player === viewer ? `<b>${stone.life}</b>` : "";
  const classes = [
    "stone",
    `${stone.player}-stone`,
    stone.life === 1 ? "expiring" : "",
    stone.revealed && stone.player !== viewer ? "revealed" : "",
  ].filter(Boolean).join(" ");
  return `<span class="${classes}" aria-label="${playerName(stone.player)} 돌, 수명 ${stone.life}">${lifeLabel}</span>`;
}

function renderBoard() {
  $$(".cell").forEach((cell) => {
    const x = Number(cell.dataset.x);
    const y = Number(cell.dataset.y);
    const stone = game.stones.find((candidate) => candidate.x === x && candidate.y === y);
    const trace = [...game.traces].reverse().find((candidate) => candidate.x === x && candidate.y === y);
    cell.innerHTML = [
      trace ? `<span class="trace"><i></i></span>` : "",
      stoneMarkup(stone, stone && visibleTo(stone, viewer)),
    ].join("");
    cell.classList.toggle("occupied-own", stone?.player === viewer);
    cell.classList.toggle("has-hidden", Boolean(stone && !visibleTo(stone, viewer)));
  });
}

function svgLine(a, b, className, extra = "") {
  const start = point(a);
  const end = point(b);
  return `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" class="${className}" ${extra}/>`;
}

function clueMarkup(line) {
  const start = point(line.a);
  const end = point(line.b);
  const middleX = (start.x + end.x) / 2;
  const middleY = (start.y + end.y) / 2;
  const angle = Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI;
  return `
    <g class="clue" transform="translate(${middleX} ${middleY}) rotate(${angle})">
      <path d="M-22 0 C-15 -9 -8 9 0 0 S15 -9 22 0"/>
      <circle cx="0" cy="0" r="3"/>
    </g>`;
}

function renderLines() {
  const ownLines = getLines(game, viewer);
  const opponent = viewer === "black" ? "white" : "black";
  const opponentLines = getLines(game, opponent);
  const triangleEffect = pulseTriangle
    ? pulseTriangle.stones.map((stone, index, stones) => svgLine(stone, stones[(index + 1) % 3], "score-line")).join("")
    : "";

  ui.lineLayer.innerHTML = `
    <g class="own-lines">${ownLines.map((line) => svgLine(line.a, line.b, `resonance-line ${viewer}`)).join("")}</g>
    <g class="opponent-clues">${opponentLines.map(clueMarkup).join("")}</g>
    <g class="score-effect">${triangleEffect}</g>`;
}

function renderStats() {
  PLAYERS.forEach((player) => {
    const stats = gameStats(game, player);
    $(`#${player}Score`).textContent = game.score[player];
    $(`#${player}Turns`).textContent = game.turns[player];
    $(`#${player}Stones`).textContent = stats.stones;
    $(`#${player}Lines`).textContent = stats.lines;
    $(`.${player}-panel`).classList.toggle("active", game.turn === player && !game.winner);
  });
  ui.roundNumber.textContent = Math.min(game.round, 30);
  ui.phaseLabel.textContent = game.overtime ? "OVERTIME ROUND" : "STANDARD ROUND";
  ui.turnMessage.innerHTML = `<b>${playerName(game.turn)}</b>의 차례입니다`;
  $("#restrictionText").textContent = game.score.black === 0
    ? "3수 득점 금지 · 첫 점은 거리 4 필요"
    : "첫 점 제한 해제 · 3수 제한 종료";
  ui.insight.textContent = game.log[0] || "상대 돌은 보이지 않습니다. 파동의 방향을 읽으세요.";
}

function render() {
  renderBoard();
  renderLines();
  renderStats();
}

function setOverlay(element, active) {
  element.classList.toggle("active", active);
}

function showToast(message, type = "") {
  ui.toast.textContent = message;
  ui.toast.className = `toast visible ${type}`;
  window.setTimeout(() => ui.toast.classList.remove("visible"), 2100);
}

function showPass() {
  if (game.winner) {
    showResult();
    return;
  }
  viewer = game.turn;
  ui.nextPlayerName.textContent = playerName(game.turn);
  ui.passStone.className = `pass-stone ${game.turn}-stone`;
  setOverlay(ui.passOverlay, true);
}

function completeOutcome(delay = 650) {
  window.clearTimeout(outcomeTimer);
  outcomeTimer = window.setTimeout(() => {
    pulseTriangle = null;
    render();
    showPass();
  }, delay);
}

function selectTriangle(index) {
  const triangle = game.pending?.triangles[index];
  if (!triangle) return;
  viewer = game.turn;
  pulseTriangle = triangle;
  chooseTriangle(game, index);
  setOverlay(ui.choiceOverlay, false);
  sound("score");
  render();
  completeOutcome(1050);
}

function showTriangleChoices(triangles) {
  ui.triangleChoices.innerHTML = triangles.map((triangle, index) => {
    const coordinates = triangle.stones
      .map((stone) => `${String.fromCharCode(65 + stone.x)}${9 - stone.y}`)
      .join(" · ");
    return `<button data-triangle="${index}"><span>삼각형 ${index + 1}</span><b>${coordinates}</b><small>변 ${triangle.lengths.join(" · ")}</small></button>`;
  }).join("");
  setOverlay(ui.choiceOverlay, true);
}

function handleCellClick(event) {
  if (!started || game.winner || ui.passOverlay.classList.contains("active") || game.pending) return;
  const cell = event.target.closest(".cell");
  if (!cell) return;
  const actingPlayer = game.turn;
  viewer = actingPlayer;
  const beforeLines = getLines(game, actingPlayer).length;
  const result = attemptPlacement(game, Number(cell.dataset.x), Number(cell.dataset.y));

  if (result.type === "invalid") {
    showToast(result.message || "선택할 수 없는 칸입니다.");
    return;
  }
  if (result.type === "forbidden") {
    sound("forbidden");
    showToast(result.message, "danger");
    return;
  }
  if (result.type === "choice") {
    sound("clue");
    render();
    showTriangleChoices(result.triangles);
    return;
  }
  if (result.type === "scored") {
    pulseTriangle = result.triangle;
    sound("score");
    render();
    completeOutcome(1050);
    return;
  }
  if (result.type === "failed") {
    sound("fail");
    render();
    showToast("숨은 돌 발견 · 이번 턴은 종료됩니다.", "danger");
    completeOutcome(1200);
    return;
  }

  const madeLine = getLines(game, actingPlayer).length > beforeLines;
  sound(madeLine ? "clue" : "place");
  render();
  completeOutcome(madeLine ? 850 : 550);
}

function startGame() {
  initializeAudio();
  game = createGame();
  viewer = "black";
  started = true;
  pulseTriangle = null;
  setOverlay(ui.startOverlay, false);
  setOverlay(ui.resultOverlay, false);
  setOverlay(ui.passOverlay, false);
  render();
}

function requestRestart() {
  if (!started || window.confirm("현재 대국을 끝내고 처음부터 다시 시작할까요?")) startGame();
}

function showResult() {
  const winner = game.winner;
  $("#resultEyebrow").textContent = winner === "draw" ? "DRAW GAME" : "GAME COMPLETE";
  $("#resultTitle").textContent = winner === "draw" ? "무승부" : `${playerName(winner)} 승리`;
  $("#resultReason").textContent = game.resultReason;
  $("#winnerStone").className = winner === "draw" ? "winner-stone draw-stone" : `winner-stone ${winner}-stone`;
  $("#finalBlack").textContent = game.score.black;
  $("#finalWhite").textContent = game.score.white;
  setOverlay(ui.passOverlay, false);
  setOverlay(ui.resultOverlay, true);
}

function openRules() {
  ui.rulesDrawer.classList.add("active");
  ui.rulesDrawer.setAttribute("aria-hidden", "false");
}

function closeRules() {
  ui.rulesDrawer.classList.remove("active");
  ui.rulesDrawer.setAttribute("aria-hidden", "true");
}

function showHome() {
  setOverlay(ui.startOverlay, true);
}

buildBoard();
render();

ui.board.addEventListener("click", handleCellClick);
$("#startButton").addEventListener("click", startGame);
$("#revealButton").addEventListener("click", () => {
  initializeAudio();
  sound("reveal");
  setOverlay(ui.passOverlay, false);
  render();
});
$("#restartButton").addEventListener("click", requestRestart);
$("#resultRestartButton").addEventListener("click", startGame);
$("#homeButton").addEventListener("click", showHome);
$("#rulesButton").addEventListener("click", openRules);
$("#startRulesButton").addEventListener("click", openRules);
$("#resultRulesButton").addEventListener("click", openRules);
$$("[data-close-rules]").forEach((button) => button.addEventListener("click", closeRules));
ui.triangleChoices.addEventListener("click", (event) => {
  const choice = event.target.closest("[data-triangle]");
  if (choice) selectTriangle(Number(choice.dataset.triangle));
});
$$("[data-rule-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    $$("[data-rule-tab]").forEach((tab) => tab.classList.toggle("active", tab === button));
    $$("[data-rule-page]").forEach((page) => page.classList.toggle("active", page.dataset.rulePage === button.dataset.ruleTab));
  });
});
$("#soundButton").addEventListener("click", () => {
  muted = !muted;
  localStorage.setItem("resonance-muted", String(muted));
  $("#soundButton").classList.toggle("muted", muted);
  if (!muted) sound("reveal");
});
$("#soundButton").classList.toggle("muted", muted);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (ui.rulesDrawer.classList.contains("active")) closeRules();
    else if (ui.startOverlay.classList.contains("active") && started) setOverlay(ui.startOverlay, false);
  }
});

if (["localhost", "127.0.0.1"].includes(location.hostname)) {
  window.__resonance = {
    get game() { return game; },
    start: startGame,
    place: (x, y) => {
      const result = attemptPlacement(game, x, y);
      render();
      return result;
    },
    reveal: () => {
      viewer = game.turn;
      setOverlay(ui.passOverlay, false);
      render();
    },
  };

  if (new URLSearchParams(location.search).get("preview") === "board") {
    startGame();
    [[0, 0], [8, 8], [4, 0], [8, 4]].forEach(([x, y]) => attemptPlacement(game, x, y));
    viewer = game.turn;
    setOverlay(ui.passOverlay, false);
    render();
  }
}
