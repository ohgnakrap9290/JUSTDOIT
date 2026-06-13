import assert from "node:assert/strict";
import { GAMES, createState, legalMoves, overlays, playMove, stats } from "../src/engine.js";

assert.equal(GAMES.length, 10);
assert.equal(new Set(GAMES.map((game) => game.id)).size, 10);

{
  const game = createState("echo");
  playMove(game, 1, 1);
  assert.equal(legalMoves(game).every(({ x, y }) => x === 1 || y === 1 || Math.abs(x - 1) === Math.abs(y - 1)), true);
}

{
  const game = createState("last");
  [[0,0],[6,6],[2,0],[6,5],[0,2],[6,4],[2,2]].forEach(([x,y]) => playMove(game,x,y));
  assert.equal(game.winner, "black");
}

{
  const game = createState("resonance");
  [[0,3],[6,6],[2,3],[6,5],[4,3],[6,4],[6,3]].forEach(([x,y]) => playMove(game,x,y));
  assert.equal(game.winner, "black");
  assert.ok(overlays(game).links.length >= 3);
}

{
  const game = createState("push");
  playMove(game, 6, 3);
  playMove(game, 5, 3);
  playMove(game, 4, 3);
  assert.equal(stats(game).primary.black, 0);
}

{
  const game = createState("isolation");
  playMove(game, 0, 0);
  playMove(game, 6, 6);
  assert.equal(stats(game).primary.black, 1);
  playMove(game, 0, 1);
  assert.equal(stats(game).primary.black, 0);
}

{
  const game = createState("balance");
  playMove(game, 0, 0);
  playMove(game, 0, 1);
  playMove(game, 1, 0);
  assert.ok(legalMoves(game).length > 0);
  assert.ok(legalMoves(game).length < 20);
}

{
  const game = createState("third");
  playMove(game, 0, 0);
  playMove(game, 6, 6);
  playMove(game, 1, 0);
  playMove(game, 6, 5);
  playMove(game, 2, 0);
  assert.equal(game.board[0][1].player, "white");
}

{
  const game = createState("bridge");
  playMove(game, 0, 0);
  playMove(game, 6, 6);
  playMove(game, 2, 0);
  assert.equal(overlays(game).controls["1,0"], "black");
  assert.equal(legalMoves(game).some(({ x, y }) => x === 1 && y === 0), false);
}

{
  const game = createState("pursuit");
  playMove(game, 0, 0);
  playMove(game, 1, 0);
  playMove(game, 2, 0);
  assert.equal(game.captures.black, 1);
  assert.equal(game.board[0][1], null);
}

{
  const game = createState("collapse");
  const moves = [[0,0],[0,1],[1,0],[1,1],[2,0],[2,1],[3,0]];
  moves.forEach(([x,y]) => playMove(game,x,y));
  assert.equal(game.board[0][0], null);
  assert.ok(game.removed.length >= 4);
}

console.log("TENFOLD engine tests passed.");
