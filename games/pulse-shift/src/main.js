import "./styles.css";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const $ = (selector) => document.querySelector(selector);

const ui = {
  hud: $("#hud"),
  start: $("#startScreen"),
  tutorial: $("#tutorialScreen"),
  result: $("#resultScreen"),
  pause: $("#pauseScreen"),
  score: $("#score"),
  time: $("#time"),
  timeRing: $("#timeRing"),
  combo: $("#combo"),
  comboFill: $("#comboFill"),
  best: $("#bestScore"),
  finalScore: $("#finalScore"),
  newBest: $("#newBest"),
  resultLabel: $("#resultLabel"),
  resultTitle: $("#resultTitle"),
  collected: $("#collectedStat"),
  maxCombo: $("#maxComboStat"),
  survival: $("#survivalStat"),
  sound: $("#soundButton"),
  pauseButton: $("#pauseButton"),
  toast: $("#toast"),
};

const CONFIG = {
  duration: 60,
  innerRatio: 0.23,
  outerRatio: 0.37,
  playerRadius: 8,
  baseSpeed: 1.45,
  hitAngle: 0.105,
};

const state = {
  mode: "start",
  score: 0,
  combo: 1,
  comboCharge: 0,
  maxCombo: 1,
  collected: 0,
  elapsed: 0,
  playerAngle: -Math.PI / 2,
  lane: 1,
  laneVisual: 1,
  direction: 1,
  objects: [],
  particles: [],
  trails: [],
  stars: [],
  pulses: [],
  lastTime: 0,
  spawnClock: 0,
  screenShake: 0,
  muted: localStorage.getItem("pulse-shift-muted") === "true",
  playedTutorial: localStorage.getItem("pulse-shift-tutorial") === "true",
  seed: 1,
  random: Math.random,
};

let width = 0;
let height = 0;
let dpr = 1;
let center = { x: 0, y: 0 };
let orbitBase = 0;
let audioContext = null;

function dateSeed() {
  const now = new Date();
  return Number(`${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`);
}

function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const isMobile = width < 680;
  center = {
    x: width * (isMobile ? 0.5 : 0.67),
    y: height * (isMobile ? 0.52 : 0.53),
  };
  orbitBase = Math.min(width, height) * (isMobile ? 0.41 : 0.39);
  buildStars();
}

function buildStars() {
  const random = mulberry32(9342);
  state.stars = Array.from({ length: Math.round((width * height) / 9000) }, () => ({
    x: random() * width,
    y: random() * height,
    size: random() * 1.4 + 0.25,
    alpha: random() * 0.45 + 0.1,
    drift: random() * 0.12 + 0.02,
  }));
}

function getRadius(lane) {
  const innerRadius = orbitBase * (CONFIG.innerRatio / CONFIG.outerRatio);
  const normalizedLane = Math.max(0, Math.min(1, lane));
  return innerRadius + (orbitBase - innerRadius) * normalizedLane;
}

function polar(angle, radius) {
  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius,
  };
}

function showScreen(name) {
  document.querySelectorAll(".screen").forEach((screen) => screen.classList.remove("active"));
  if (name) ui[name].classList.add("active");
}

function initializeAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === "suspended") audioContext.resume();
}

function sound(type) {
  if (state.muted) return;
  initializeAudio();
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  const sounds = {
    shift: { from: 330, to: 480, duration: 0.08, volume: 0.055, wave: "sine" },
    collect: { from: 620, to: 920, duration: 0.11, volume: 0.075, wave: "sine" },
    combo: { from: 880, to: 1320, duration: 0.18, volume: 0.09, wave: "triangle" },
    hit: { from: 100, to: 45, duration: 0.3, volume: 0.13, wave: "sawtooth" },
    start: { from: 240, to: 540, duration: 0.32, volume: 0.07, wave: "sine" },
    finish: { from: 520, to: 1040, duration: 0.45, volume: 0.07, wave: "triangle" },
  };
  const setting = sounds[type];
  oscillator.type = setting.wave;
  oscillator.frequency.setValueAtTime(setting.from, now);
  oscillator.frequency.exponentialRampToValueAtTime(setting.to, now + setting.duration);
  gain.gain.setValueAtTime(setting.volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + setting.duration);
  oscillator.start(now);
  oscillator.stop(now + setting.duration);
}

function vibrate(pattern) {
  if ("vibrate" in navigator) navigator.vibrate(pattern);
}

function resetGame() {
  state.score = 0;
  state.combo = 1;
  state.comboCharge = 0;
  state.maxCombo = 1;
  state.collected = 0;
  state.elapsed = 0;
  state.playerAngle = -Math.PI / 2;
  state.lane = 1;
  state.laneVisual = 1;
  state.direction = 1;
  state.objects = [];
  state.particles = [];
  state.trails = [];
  state.pulses = [];
  state.spawnClock = 0.55;
  state.screenShake = 0;
  state.seed = dateSeed();
  state.random = mulberry32(state.seed);
  updateHud();
}

function beginGame() {
  resetGame();
  state.mode = "playing";
  showScreen(null);
  ui.hud.classList.add("active");
  ui.pauseButton.classList.add("visible");
  sound("start");
  state.lastTime = performance.now();
}

function requestStart() {
  initializeAudio();
  if (!state.playedTutorial) {
    state.mode = "tutorial";
    showScreen("tutorial");
    localStorage.setItem("pulse-shift-tutorial", "true");
    state.playedTutorial = true;
  } else {
    beginGame();
  }
}

function finishGame(reason = "complete") {
  if (state.mode !== "playing") return;
  state.mode = "result";
  ui.hud.classList.remove("active");
  ui.pauseButton.classList.remove("visible");
  showScreen("result");

  const score = Math.round(state.score);
  const best = Number(localStorage.getItem("pulse-shift-best") || 0);
  const isBest = score > best;
  if (isBest) localStorage.setItem("pulse-shift-best", String(score));
  ui.finalScore.textContent = score.toLocaleString("ko-KR");
  ui.best.textContent = Math.max(score, best).toLocaleString("ko-KR");
  ui.newBest.classList.toggle("visible", isBest);
  ui.collected.textContent = state.collected;
  ui.maxCombo.textContent = state.maxCombo;
  ui.survival.textContent = Math.min(60, Math.floor(state.elapsed));

  if (reason === "hit") {
    ui.resultLabel.textContent = "SIGNAL LOST";
    ui.resultTitle.textContent = state.elapsed > 35 ? "거의 다 왔어요." : "흐름을 다시 잡아볼까요?";
    sound("hit");
    vibrate([80, 45, 100]);
  } else {
    ui.resultLabel.textContent = "SIGNAL COMPLETE";
    ui.resultTitle.textContent = "60초의 흐름을 완성했어요.";
    sound("finish");
    vibrate([30, 40, 30]);
  }
}

function togglePause() {
  if (state.mode === "playing") {
    state.mode = "paused";
    showScreen("pause");
  } else if (state.mode === "paused") {
    state.mode = "playing";
    showScreen(null);
    state.lastTime = performance.now();
  }
}

function goHome() {
  state.mode = "start";
  showScreen("start");
  ui.hud.classList.remove("active");
  ui.pauseButton.classList.remove("visible");
}

function shiftLane() {
  if (state.mode === "tutorial") {
    beginGame();
    return;
  }
  if (state.mode !== "playing") return;
  state.lane = state.lane === 0 ? 1 : 0;
  const point = polar(state.playerAngle, getRadius(state.laneVisual));
  state.pulses.push({ x: point.x, y: point.y, radius: 8, alpha: 0.8, color: "#7cf8df" });
  sound("shift");
  vibrate(8);
}

function spawnObject() {
  const progress = state.elapsed / CONFIG.duration;
  const lane = state.random() > 0.5 ? 1 : 0;
  const ahead = 1.8 + state.random();
  const angle = state.playerAngle + ahead * state.direction;
  const hazardChance = Math.min(0.72, 0.38 + progress * 0.28);
  const type = state.elapsed < 5 || state.random() >= hazardChance ? "signal" : "hazard";
  state.objects.push({
    type,
    lane,
    angle,
    spin: type === "hazard" ? (state.random() - 0.5) * 1.8 : 0,
    rotation: state.random() * Math.PI,
    pulse: state.random() * Math.PI * 2,
    alive: true,
  });

  if (progress > 0.42 && type === "hazard" && state.random() < 0.22) {
    state.objects.push({
      type: "signal",
      lane: lane === 0 ? 1 : 0,
      angle: angle + 0.08 * state.direction,
      spin: 0,
      rotation: 0,
      pulse: 0,
      alive: true,
    });
  }
}

function angularDistance(a, b) {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

function addParticles(x, y, color, count, speed = 80) {
  for (let index = 0; index < count; index += 1) {
    const angle = state.random() * Math.PI * 2;
    const velocity = speed * (0.35 + state.random());
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life: 0.45 + state.random() * 0.45,
      maxLife: 0.9,
      size: 1.5 + state.random() * 3.5,
      color,
    });
  }
}

function collect(object) {
  object.alive = false;
  state.collected += 1;
  state.comboCharge += 1;
  const gained = 100 * state.combo;
  state.score += gained;
  const point = polar(object.angle, getRadius(object.lane));
  addParticles(point.x, point.y, "#7cf8df", 15, 100);
  state.pulses.push({ x: point.x, y: point.y, radius: 10, alpha: 1, color: "#7cf8df" });

  if (state.comboCharge >= 4 && state.combo < 8) {
    state.combo += 1;
    state.comboCharge = 0;
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    sound("combo");
  } else {
    sound("collect");
  }
  vibrate(12);
}

function update(dt) {
  if (state.mode !== "playing") return;
  state.elapsed += dt;
  if (state.elapsed >= CONFIG.duration) {
    state.elapsed = CONFIG.duration;
    finishGame("complete");
    return;
  }

  const progress = state.elapsed / CONFIG.duration;
  const speed = CONFIG.baseSpeed + progress * 0.82;
  state.playerAngle += speed * dt * state.direction;
  state.laneVisual += (state.lane - state.laneVisual) * Math.min(1, dt * 14);
  state.score += dt * 12 * state.combo;
  state.spawnClock -= dt;

  if (state.spawnClock <= 0) {
    spawnObject();
    state.spawnClock = Math.max(0.43, 0.86 - progress * 0.3) + state.random() * 0.2;
  }

  const playerPoint = polar(state.playerAngle, getRadius(state.laneVisual));
  state.trails.push({ x: playerPoint.x, y: playerPoint.y, life: 0.45, maxLife: 0.45 });
  if (state.trails.length > 42) state.trails.shift();

  state.objects.forEach((object) => {
    object.angle -= speed * dt * state.direction * (object.type === "hazard" ? 0.12 : 0.08);
    object.rotation += object.spin * dt;
    object.pulse += dt * 4;
    const distance = angularDistance(object.angle, state.playerAngle);
    const laneDistance = Math.abs(object.lane - state.laneVisual);
    if (object.alive && distance < CONFIG.hitAngle && laneDistance < 0.34) {
      if (object.type === "signal") {
        collect(object);
      } else {
        object.alive = false;
        const point = polar(object.angle, getRadius(object.lane));
        addParticles(point.x, point.y, "#ff5e8a", 28, 155);
        state.screenShake = 12;
        finishGame("hit");
      }
    }
    const behind = Math.atan2(Math.sin(state.playerAngle - object.angle), Math.cos(state.playerAngle - object.angle)) * state.direction;
    if (behind > 0.65) object.alive = false;
  });
  state.objects = state.objects.filter((object) => object.alive);

  state.particles.forEach((particle) => {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.97;
    particle.vy *= 0.97;
    particle.life -= dt;
  });
  state.particles = state.particles.filter((particle) => particle.life > 0);

  state.trails.forEach((trail) => { trail.life -= dt; });
  state.trails = state.trails.filter((trail) => trail.life > 0);

  state.pulses.forEach((pulse) => {
    pulse.radius += dt * 85;
    pulse.alpha -= dt * 1.9;
  });
  state.pulses = state.pulses.filter((pulse) => pulse.alpha > 0);
  state.screenShake *= 0.85;
  updateHud();
}

function updateHud() {
  const remaining = Math.max(0, Math.ceil(CONFIG.duration - state.elapsed));
  ui.score.textContent = Math.round(state.score).toLocaleString("ko-KR");
  ui.time.textContent = remaining;
  ui.combo.textContent = state.combo;
  ui.comboFill.style.width = `${(state.comboCharge / 4) * 100}%`;
  ui.timeRing.style.setProperty("--time-progress", `${(remaining / CONFIG.duration) * 360}deg`);
  ui.timeRing.classList.toggle("urgent", remaining <= 10);
}

function drawBackground(time) {
  const gradient = ctx.createRadialGradient(center.x, center.y, 20, center.x, center.y, Math.max(width, height) * 0.7);
  gradient.addColorStop(0, "#101b3a");
  gradient.addColorStop(0.52, "#090f25");
  gradient.addColorStop(1, "#050711");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  state.stars.forEach((star) => {
    const alpha = star.alpha * (0.65 + Math.sin(time * 0.001 * star.drift * 30 + star.x) * 0.35);
    ctx.fillStyle = `rgba(166, 193, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  });

  const glow = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, orbitBase * 1.4);
  glow.addColorStop(0, "rgba(47, 83, 170, 0.12)");
  glow.addColorStop(0.55, "rgba(28, 46, 102, 0.08)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(center.x - orbitBase * 1.5, center.y - orbitBase * 1.5, orbitBase * 3, orbitBase * 3);
}

function drawOrbit(radius, alpha = 1) {
  ctx.save();
  ctx.strokeStyle = `rgba(121, 151, 222, ${0.13 * alpha})`;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 9]);
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = `rgba(124, 248, 223, ${0.035 * alpha})`;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawCore(time) {
  const pulse = 1 + Math.sin(time * 0.0022) * 0.04;
  const coreRadius = orbitBase * 0.105 * pulse;
  const gradient = ctx.createRadialGradient(center.x - coreRadius * 0.25, center.y - coreRadius * 0.3, 0, center.x, center.y, coreRadius);
  gradient.addColorStop(0, "rgba(151, 253, 233, 0.26)");
  gradient.addColorStop(0.5, "rgba(77, 164, 205, 0.12)");
  gradient.addColorStop(1, "rgba(22, 47, 98, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(center.x, center.y, coreRadius * 2.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#0c1633";
  ctx.strokeStyle = "rgba(124, 248, 223, 0.28)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(center.x, center.y, coreRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(124, 248, 223, 0.75)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(center.x, center.y, coreRadius * 0.45, -Math.PI * 0.8, Math.PI * 0.55);
  ctx.stroke();
}

function drawSignal(object) {
  const point = polar(object.angle, getRadius(object.lane));
  const pulse = 1 + Math.sin(object.pulse) * 0.14;
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.shadowColor = "#7cf8df";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#7cf8df";
  ctx.beginPath();
  ctx.arc(0, 0, 5.5 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(124,248,223,.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, 12 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawHazard(object) {
  const point = polar(object.angle, getRadius(object.lane));
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.rotate(object.rotation);
  ctx.shadowColor = "#ff477e";
  ctx.shadowBlur = 16;
  ctx.fillStyle = "rgba(255, 71, 126, 0.9)";
  ctx.beginPath();
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    const radius = index % 2 ? 6 : 12;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffd0dc";
  ctx.beginPath();
  ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlayer() {
  state.trails.forEach((trail) => {
    ctx.fillStyle = `rgba(124,248,223,${(trail.life / trail.maxLife) * 0.22})`;
    ctx.beginPath();
    ctx.arc(trail.x, trail.y, CONFIG.playerRadius * (trail.life / trail.maxLife), 0, Math.PI * 2);
    ctx.fill();
  });

  const point = polar(state.playerAngle, getRadius(state.laneVisual));
  const glow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 28);
  glow.addColorStop(0, "rgba(255,255,255,.9)");
  glow.addColorStop(0.15, "rgba(124,248,223,.75)");
  glow.addColorStop(1, "rgba(124,248,223,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(point.x, point.y, 28, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = "#7cf8df";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#eafffb";
  ctx.beginPath();
  ctx.arc(point.x, point.y, CONFIG.playerRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawEffects() {
  state.particles.forEach((particle) => {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  state.pulses.forEach((pulse) => {
    ctx.strokeStyle = pulse.color.replace(")", `, ${pulse.alpha})`).replace("rgb", "rgba").replace("#7cf8df", `rgba(124,248,223,${pulse.alpha})`);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function draw(time) {
  ctx.save();
  const shakeX = state.screenShake ? (Math.random() - 0.5) * state.screenShake : 0;
  const shakeY = state.screenShake ? (Math.random() - 0.5) * state.screenShake : 0;
  ctx.translate(shakeX, shakeY);
  drawBackground(time);

  const visible = ["playing", "paused", "result"].includes(state.mode);
  if (visible) {
    drawOrbit(getRadius(0));
    drawOrbit(getRadius(1));
    drawCore(time);
    state.objects.forEach((object) => object.type === "signal" ? drawSignal(object) : drawHazard(object));
    drawPlayer();
    drawEffects();
  } else {
    const decorativeAlpha = width < 680 ? 0.25 : 0.5;
    drawOrbit(getRadius(0), decorativeAlpha);
    drawOrbit(getRadius(1), decorativeAlpha);
    drawCore(time);
  }
  ctx.restore();
}

function frame(time) {
  const dt = Math.max(0, Math.min(0.033, (time - state.lastTime) / 1000 || 0));
  state.lastTime = time;
  update(dt);
  draw(time);
  requestAnimationFrame(frame);
}

function toggleSound() {
  state.muted = !state.muted;
  localStorage.setItem("pulse-shift-muted", String(state.muted));
  ui.sound.classList.toggle("muted", state.muted);
  ui.sound.setAttribute("aria-label", state.muted ? "사운드 켜기" : "사운드 끄기");
  if (!state.muted) sound("shift");
}

async function shareResult() {
  const score = Math.round(state.score);
  const text = `PULSE SHIFT 오늘의 기록: ${score.toLocaleString("ko-KR")}점 · 최대 ${state.maxCombo}x 플로우\n60초 안에 내 기록을 넘어보세요.`;
  try {
    if (navigator.share) {
      await navigator.share({ title: "PULSE SHIFT", text, url: location.href });
    } else {
      await navigator.clipboard.writeText(`${text}\n${location.href}`);
      showToast("결과를 복사했어요");
    }
  } catch (error) {
    if (error.name !== "AbortError") showToast("공유하지 못했어요");
  }
}

function showToast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add("visible");
  window.setTimeout(() => ui.toast.classList.remove("visible"), 1800);
}

function handlePrimaryInput(event) {
  if (event.target.closest("button, a")) return;
  if (state.mode === "tutorial" || state.mode === "playing") shiftLane();
}

$("#startButton").addEventListener("click", requestStart);
$("#retryButton").addEventListener("click", beginGame);
$("#resumeButton").addEventListener("click", togglePause);
$("#quitButton").addEventListener("click", goHome);
$("#shareButton").addEventListener("click", shareResult);
ui.sound.addEventListener("click", toggleSound);
ui.pauseButton.addEventListener("click", togglePause);
canvas.addEventListener("pointerdown", handlePrimaryInput);
document.addEventListener("pointerdown", (event) => {
  if (state.mode === "tutorial") handlePrimaryInput(event);
});
document.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  if (["Space", "ArrowUp", "ArrowDown"].includes(event.code)) {
    event.preventDefault();
    if (state.mode === "start") requestStart();
    else if (state.mode === "paused") togglePause();
    else shiftLane();
  }
  if (event.code === "KeyR" && state.mode === "result") beginGame();
  if (event.code === "Escape" && ["playing", "paused"].includes(state.mode)) togglePause();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && state.mode === "playing") togglePause();
});
window.addEventListener("resize", resize);

const daily = dateSeed();
$("#dailyNumber").textContent = `#${String(daily % 1000).padStart(3, "0")}`;
ui.best.textContent = Number(localStorage.getItem("pulse-shift-best") || 0).toLocaleString("ko-KR");
ui.sound.classList.toggle("muted", state.muted);
resize();
requestAnimationFrame(frame);
