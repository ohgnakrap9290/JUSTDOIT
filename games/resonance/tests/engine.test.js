import assert from "node:assert/strict";
import {
  alignedDistance,
  attemptPlacement,
  createGame,
  debugAddStone,
  getLines,
  trianglesForStone,
} from "../src/engine.js";

assert.equal(alignedDistance({ x: 0, y: 0 }, { x: 4, y: 0 }), 4);
assert.equal(alignedDistance({ x: 1, y: 1 }, { x: 3, y: 3 }), 2);
assert.equal(alignedDistance({ x: 0, y: 0 }, { x: 2, y: 3 }), null);

{
  const game = createGame();
  debugAddStone(game, "black", 0, 0);
  debugAddStone(game, "black", 4, 0);
  assert.equal(getLines(game, "black").length, 1);
  debugAddStone(game, "white", 2, 0);
  assert.equal(getLines(game, "black").length, 0, "a living stone must block resonance");
}

{
  const game = createGame();
  debugAddStone(game, "white", 0, 0);
  debugAddStone(game, "white", 2, 0);
  const final = debugAddStone(game, "white", 0, 2);
  assert.equal(trianglesForStone(game, final).length, 1);
}

{
  const game = createGame();
  game.turn = "white";
  debugAddStone(game, "white", 0, 0);
  debugAddStone(game, "white", 2, 0);
  const result = attemptPlacement(game, 0, 2);
  assert.equal(result.type, "scored");
  assert.equal(game.score.white, 1);
  assert.equal(game.stones.length, 0);
  assert.equal(game.traces.length, 3);
}

{
  const game = createGame();
  game.turns.black = 2;
  debugAddStone(game, "black", 0, 0);
  debugAddStone(game, "black", 2, 0);
  const result = attemptPlacement(game, 0, 2);
  assert.equal(result.type, "forbidden", "black cannot score on its third turn");
}

{
  const game = createGame();
  debugAddStone(game, "black", 0, 0);
  debugAddStone(game, "black", 2, 0);
  const result = attemptPlacement(game, 0, 2);
  assert.equal(result.type, "forbidden", "black's first score needs a side of length four");
}

{
  const game = createGame();
  debugAddStone(game, "black", 0, 0);
  debugAddStone(game, "black", 4, 0);
  const result = attemptPlacement(game, 0, 4);
  assert.equal(result.type, "scored", "black may open with a triangle containing a side of length four");
}

{
  const game = createGame();
  debugAddStone(game, "white", 3, 3);
  const result = attemptPlacement(game, 3, 3);
  assert.equal(result.type, "failed");
  assert.equal(game.turn, "white");
  assert.equal(game.turns.black, 1);
}

console.log("Resonance engine tests passed.");
