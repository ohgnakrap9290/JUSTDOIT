export const PLAYERS = ["black", "white"];
export const OTHER = { black: "white", white: "black" };

const BOARD_SIZE = 9;

export function alignedDistance(a, b) {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  if (dx === 0 && dy > 0) return dy;
  if (dy === 0 && dx > 0) return dx;
  if (dx === dy && dx > 0) return dx;
  return null;
}

function pointsBetween(a, b) {
  const distance = alignedDistance(a, b);
  if (!distance) return [];
  const stepX = Math.sign(b.x - a.x);
  const stepY = Math.sign(b.y - a.y);
  return Array.from({ length: distance - 1 }, (_, index) => ({
    x: a.x + stepX * (index + 1),
    y: a.y + stepY * (index + 1),
  }));
}

export function createGame() {
  return {
    stones: [],
    traces: [],
    turn: "black",
    turns: { black: 0, white: 0 },
    score: { black: 0, white: 0 },
    globalTurn: 0,
    round: 1,
    nextStoneId: 1,
    thresholdReached: false,
    overtime: false,
    winner: null,
    resultReason: "",
    pending: null,
    log: ["흑이 첫 수를 준비합니다."],
  };
}

export function stoneAt(game, x, y) {
  return game.stones.find((stone) => stone.x === x && stone.y === y);
}

export function isResonant(game, first, second) {
  if (!first || !second || first.player !== second.player) return false;
  const distance = alignedDistance(first, second);
  if (!distance || distance < 2 || distance > 4) return false;
  return !pointsBetween(first, second).some((point) => stoneAt(game, point.x, point.y));
}

export function getLines(game, player) {
  const stones = game.stones.filter((stone) => stone.player === player);
  const lines = [];
  for (let first = 0; first < stones.length; first += 1) {
    for (let second = first + 1; second < stones.length; second += 1) {
      if (isResonant(game, stones[first], stones[second])) {
        lines.push({
          a: stones[first],
          b: stones[second],
          distance: alignedDistance(stones[first], stones[second]),
        });
      }
    }
  }
  return lines;
}

function triangleArea(a, b, c) {
  return (a.x * (b.y - c.y)) + (b.x * (c.y - a.y)) + (c.x * (a.y - b.y));
}

export function trianglesForStone(game, stone) {
  const allies = game.stones.filter((candidate) => candidate.player === stone.player && candidate.id !== stone.id);
  const triangles = [];
  for (let first = 0; first < allies.length; first += 1) {
    for (let second = first + 1; second < allies.length; second += 1) {
      const a = allies[first];
      const b = allies[second];
      if (triangleArea(stone, a, b) === 0) continue;
      if (isResonant(game, stone, a) && isResonant(game, stone, b) && isResonant(game, a, b)) {
        triangles.push({
          ids: [stone.id, a.id, b.id],
          stones: [stone, a, b],
          lengths: [
            alignedDistance(stone, a),
            alignedDistance(stone, b),
            alignedDistance(a, b),
          ].sort((x, y) => x - y),
        });
      }
    }
  }
  return triangles;
}

export function visibleTo(stone, viewer) {
  return stone.player === viewer || stone.life === 1 || stone.revealed;
}

function addTrace(game, stone, reason) {
  game.traces.push({
    x: stone.x,
    y: stone.y,
    player: stone.player,
    reason,
    expiresAfter: game.globalTurn + 3,
  });
}

function removeStones(game, ids, reason) {
  const removed = game.stones.filter((stone) => ids.includes(stone.id));
  removed.forEach((stone) => addTrace(game, stone, reason));
  game.stones = game.stones.filter((stone) => !ids.includes(stone.id));
}

function tiebreak(game) {
  if (game.score.black !== game.score.white) {
    return { winner: game.score.black > game.score.white ? "black" : "white", reason: "최종 점수에서 앞섰습니다." };
  }
  const lines = {
    black: getLines(game, "black").length,
    white: getLines(game, "white").length,
  };
  if (lines.black !== lines.white) {
    return { winner: lines.black > lines.white ? "black" : "white", reason: "유지 중인 공명선 수에서 앞섰습니다." };
  }
  const life = {
    black: game.stones.filter((stone) => stone.player === "black").reduce((sum, stone) => sum + stone.life, 0),
    white: game.stones.filter((stone) => stone.player === "white").reduce((sum, stone) => sum + stone.life, 0),
  };
  if (life.black !== life.white) {
    return { winner: life.black > life.white ? "black" : "white", reason: "남은 돌의 수명 합에서 앞섰습니다." };
  }
  return { winner: "draw", reason: "모든 최종 판정이 같습니다." };
}

function finish(game, result) {
  game.winner = result.winner;
  game.resultReason = result.reason;
}

function resolveRoundEnd(game) {
  const reachedFive = game.score.black >= 5 || game.score.white >= 5;
  if (reachedFive) game.thresholdReached = true;

  if (game.thresholdReached) {
    if (game.score.black !== game.score.white) {
      finish(game, {
        winner: game.score.black > game.score.white ? "black" : "white",
        reason: "5점 도달 라운드 종료 판정에서 앞섰습니다.",
      });
      return;
    }
    game.overtime = true;
  }

  if (game.overtime && game.score.black !== game.score.white) {
    finish(game, {
      winner: game.score.black > game.score.white ? "black" : "white",
      reason: "연장 라운드에서 점수 차를 만들었습니다.",
    });
    return;
  }

  if (game.turns.black >= 30 && game.turns.white >= 30) finish(game, tiebreak(game));
}

function endTurn(game, message) {
  const player = game.turn;
  game.stones.forEach((stone) => {
    if (stone.player === player) stone.life -= 1;
  });
  const expired = game.stones.filter((stone) => stone.life <= 0);
  removeStones(game, expired.map((stone) => stone.id), "expired");

  game.stones.forEach((stone) => {
    if (stone.player === player && stone.revealed) stone.revealed = false;
  });

  game.turns[player] += 1;
  game.globalTurn += 1;
  game.traces = game.traces.filter((trace) => trace.expiresAfter > game.globalTurn);
  game.log.unshift(message);
  game.log = game.log.slice(0, 8);

  if (player === "white") {
    resolveRoundEnd(game);
    game.round += 1;
  }
  game.turn = OTHER[player];
}

function forbiddenReason(game, triangles) {
  if (game.turn !== "black" || triangles.length === 0) return null;
  const blackTurnNumber = game.turns.black + 1;
  if (blackTurnNumber === 3) return "흑의 세 번째 수로 득점할 수 없습니다.";
  return null;
}

export function attemptPlacement(game, x, y) {
  if (game.winner || game.pending) return { type: "blocked" };
  if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return { type: "invalid" };

  const occupied = stoneAt(game, x, y);
  if (occupied) {
    if (occupied.player === game.turn) return { type: "invalid", message: "이미 내 돌이 있는 자리입니다." };
    occupied.revealed = true;
    const foundPlayer = occupied.player === "black" ? "흑" : "백";
    endTurn(game, `숨은 ${foundPlayer} 돌을 발견했습니다. 배치는 실패했습니다.`);
    return { type: "failed", stone: occupied };
  }

  const stone = {
    id: game.nextStoneId,
    player: game.turn,
    x,
    y,
    life: 7,
    revealed: false,
  };
  game.stones.push(stone);
  let triangles = trianglesForStone(game, stone);
  const forbidden = forbiddenReason(game, triangles);
  if (forbidden) {
    game.stones = game.stones.filter((candidate) => candidate.id !== stone.id);
    return { type: "forbidden", message: forbidden };
  }
  if (game.turn === "black" && game.score.black === 0 && triangles.length > 0) {
    triangles = triangles.filter((triangle) => triangle.lengths.includes(4));
    if (triangles.length === 0) {
      game.stones = game.stones.filter((candidate) => candidate.id !== stone.id);
      return { type: "forbidden", message: "흑의 첫 득점에는 거리 4인 변이 필요합니다." };
    }
  }

  game.nextStoneId += 1;
  if (triangles.length > 1) {
    game.pending = { stoneId: stone.id, triangles };
    return { type: "choice", triangles };
  }
  if (triangles.length === 1) {
    scoreTriangle(game, triangles[0]);
    return { type: "scored", triangle: triangles[0] };
  }

  const playerName = game.turn === "black" ? "흑" : "백";
  endTurn(game, `${playerName}이 (${x + 1}, ${y + 1})에 돌을 놓았습니다.`);
  return { type: "placed", stone };
}

export function scoreTriangle(game, triangle) {
  if (!triangle) return;
  const player = game.turn;
  game.score[player] += 1;
  removeStones(game, triangle.ids, "scored");
  game.pending = null;
  const name = player === "black" ? "흑" : "백";
  endTurn(game, `${name}이 공명 삼각형을 완성해 1점을 얻었습니다.`);
}

export function chooseTriangle(game, index) {
  if (!game.pending) return { type: "invalid" };
  const triangle = game.pending.triangles[index];
  if (!triangle) return { type: "invalid" };
  scoreTriangle(game, triangle);
  return { type: "scored", triangle };
}

export function gameStats(game, player) {
  const stones = game.stones.filter((stone) => stone.player === player);
  return {
    stones: stones.length,
    lines: getLines(game, player).length,
    life: stones.reduce((sum, stone) => sum + stone.life, 0),
  };
}

export function debugAddStone(game, player, x, y, life = 7) {
  const stone = { id: game.nextStoneId++, player, x, y, life, revealed: false };
  game.stones.push(stone);
  return stone;
}
