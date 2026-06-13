export const SIZE = 7;
export const OTHER = { black: "white", white: "black" };
export const DIRS = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];

const inside = (x, y) => x >= 0 && y >= 0 && x < SIZE && y < SIZE;
const key = (x, y) => `${x},${y}`;
const at = (state, x, y) => state.board[y]?.[x] || null;
const clone = (value) => structuredClone(value);

export const GAMES = [
  {
    id: "echo", number: "01", title: "메아리", english: "ECHO", time: "5–8분", level: "입문",
    color: "#e85d4a", tagline: "상대의 마지막 수가, 내 다음 길을 정한다.",
    objective: "상대가 규칙에 맞는 수를 둘 수 없게 만드세요.",
    summary: "직전 돌과 같은 가로·세로·대각선 위에만 다음 돌을 놓는 길막기 게임.",
    setup: "7×7 판에서 흑이 중앙을 제외한 원하는 곳에 첫 돌을 놓습니다. 돌은 움직이거나 사라지지 않습니다.",
    turns: ["첫 수 이후에는 상대가 방금 둔 돌과 같은 가로·세로·대각선 위의 빈칸에 둡니다.", "거리에는 제한이 없지만 이미 돌이 있는 칸은 선택할 수 없습니다.", "매번 새로 놓인 돌이 다음 플레이어의 기준점이 됩니다."],
    win: "자기 차례에 조건을 만족하는 빈칸이 하나도 없으면 패배합니다.",
    tip: "판의 가장자리와 이미 채워진 줄을 이용하면 상대의 선택지를 빠르게 줄일 수 있습니다.",
  },
  {
    id: "last", number: "02", title: "마지막 돌", english: "LAST FIVE", time: "6–10분", level: "입문",
    color: "#1b7064", tagline: "여섯 번째 수가, 첫 번째 수를 지운다.",
    objective: "살아 있는 네 돌로 정사각형을 먼저 만드세요.",
    summary: "각자 최근 돌 다섯 개만 유지되는 움직이는 도형 퍼즐.",
    setup: "빈 7×7 판에서 시작합니다. 각 플레이어는 판 위에 자기 돌을 최대 5개까지만 유지합니다.",
    turns: ["차례마다 빈칸에 돌 하나를 놓습니다.", "자기 돌이 6개가 되는 순간 가장 오래된 자기 돌이 사라집니다.", "가로형뿐 아니라 기울어진 정사각형도 인정합니다."],
    win: "현재 살아 있는 자기 돌 네 개가 정사각형을 이루면 즉시 승리합니다. 30라운드까지 완성되지 않으면 한 수로 완성 가능한 정사각형 후보가 많은 쪽이 이깁니다.",
    tip: "사라질 돌을 미리 계산해 같은 자리에서 두 개의 정사각형 후보를 만드세요.",
  },
  {
    id: "resonance", number: "03", title: "공명", english: "RESONANCE", time: "8–12분", level: "중급",
    color: "#5368d9", tagline: "돌보다 먼저, 연결할 길을 설계하라.",
    objective: "흑은 좌우, 백은 위아래 가장자리를 연결하세요.",
    summary: "가까운 같은 색 돌이 자동으로 이어지는 경로 연결 게임.",
    setup: "7×7 판을 사용합니다. 흑은 좌우 연결, 백은 위아래 연결이 목표입니다.",
    turns: ["빈칸에 돌을 하나 놓습니다.", "같은 색 돌이 가로·세로·대각선으로 2칸 이내면 자동으로 연결됩니다.", "상대 돌은 연결을 막지 않지만 같은 칸은 차지할 수 없습니다."],
    win: "자기 돌과 연결선을 따라 목표한 두 가장자리 사이에 연속 경로를 만들면 승리합니다.",
    tip: "직선 하나보다 두 갈래로 뻗는 허브를 만들면 한 수로 여러 연결을 완성할 수 있습니다.",
  },
  {
    id: "push", number: "04", title: "밀어내기", english: "PUSH OUT", time: "6–10분", level: "중급",
    color: "#f0a52b", tagline: "한 점을 놓으면, 판 전체가 한 칸 흔들린다.",
    objective: "상대 돌 4개를 판 밖으로 밀어내세요.",
    summary: "착점 주변의 돌을 바깥으로 밀어내는 연쇄 충돌 게임.",
    setup: "빈 7×7 판과 흑백 돌을 사용합니다. 먼저 상대 돌 4개를 획득하면 이깁니다.",
    turns: ["빈칸에 새 돌을 놓습니다.", "착점과 상하좌우로 붙은 돌은 착점에서 멀어지는 방향으로 한 칸 밀립니다.", "그 뒤의 돌도 같은 방향으로 연쇄적으로 밀리며, 판 밖으로 나간 돌은 상대가 획득합니다."],
    win: "상대 색 돌을 누적 4개 먼저 판 밖으로 밀어내면 승리합니다. 24라운드 종료 시에는 포획 수가 높은 쪽이 이깁니다.",
    tip: "가장자리 근처에 상대 돌이 쌓이도록 유도한 뒤 한 번의 연쇄 밀기로 마무리하세요.",
  },
  {
    id: "isolation", number: "05", title: "고립", english: "SOLITUDE", time: "7–10분", level: "입문",
    color: "#8d63b8", tagline: "연결하지 않을수록 강해지는 영토.",
    objective: "24라운드 종료 때 고립된 자기 돌을 더 많이 남기세요.",
    summary: "상하좌우에 아무 돌도 닿지 않은 돌이 점수가 되는 역발상 영역 게임.",
    setup: "빈 7×7 판에서 시작해 흑과 백이 각각 24번 둡니다. 대각선 접촉은 허용됩니다.",
    turns: ["차례마다 빈칸에 돌 하나를 놓습니다.", "상하좌우에 다른 살아 있는 돌이 하나도 없는 돌은 고립 상태가 됩니다.", "상대의 고립된 돌 옆을 차지해 점수를 빼앗을 수 있습니다."],
    win: "백의 24번째 수가 끝난 뒤 고립된 돌이 더 많은 플레이어가 승리합니다.",
    tip: "내 점수를 늘리는 수보다 상대의 고립 두 개를 동시에 깨는 수가 더 강할 수 있습니다.",
  },
  {
    id: "balance", number: "06", title: "균형", english: "BALANCE", time: "5–8분", level: "중급",
    color: "#2b8eaa", tagline: "판을 기울이지 않는 마지막 한 수.",
    objective: "상대가 균형을 지키며 둘 곳이 없게 만드세요.",
    summary: "모든 돌의 무게중심을 중앙 허용 범위 안에 유지하는 배치 게임.",
    setup: "7×7 판의 중앙이 균형점입니다. 모든 돌은 색과 관계없이 하나의 무게로 계산합니다.",
    turns: ["빈칸에 돌 하나를 놓습니다.", "착수 후 전체 돌의 가로 무게 차와 세로 무게 차가 각각 8 이하여야 합니다.", "균형을 깨는 자리는 선택할 수 없습니다."],
    win: "자기 차례에 균형을 유지하며 둘 수 있는 빈칸이 없으면 패배합니다.",
    tip: "중앙 돌은 안전하지만 귀중합니다. 상대가 중앙을 소모하게 만든 뒤 가장자리를 장악하세요.",
  },
  {
    id: "third", number: "07", title: "세 번째는 적", english: "THIRD TURNS", time: "7–12분", level: "중급",
    color: "#d55481", tagline: "세 개를 잇는 순간, 가운데가 배신한다.",
    objective: "자기 색 네 돌로 정사각형을 먼저 만드세요.",
    summary: "같은 색 세 돌이 일렬로 놓이면 가운데 돌이 상대 색으로 뒤집히는 변환 게임.",
    setup: "빈 7×7 판에서 시작합니다. 정사각형은 크기와 방향이 자유입니다.",
    turns: ["빈칸에 돌 하나를 놓습니다.", "가로·세로·대각선으로 연속한 같은 색 돌 3개가 생기면 가운데 돌이 상대 색으로 바뀝니다.", "뒤집힘으로 또 다른 세 줄이 생기면 안정될 때까지 연쇄 처리합니다."],
    win: "모든 변환이 끝난 뒤 자기 색 돌 네 개가 정사각형을 이루면 승리합니다.",
    tip: "세 줄을 피하는 것만 생각하지 말고, 일부러 상대 색을 만들어 다음 턴에 다시 뒤집어 보세요.",
  },
  {
    id: "bridge", number: "08", title: "다리", english: "BRIDGES", time: "8–12분", level: "중급",
    color: "#698c32", tagline: "돌 사이의 빈칸이 길이 된다.",
    objective: "흑은 좌우, 백은 위아래를 자기 길로 연결하세요.",
    summary: "두 돌 사이 정확히 한 칸을 지배해 보이지 않는 다리를 놓는 연결 게임.",
    setup: "7×7 판에서 흑은 좌우, 백은 위아래 연결을 목표로 합니다.",
    turns: ["빈칸에 돌 하나를 놓습니다.", "같은 색 돌 두 개가 가로·세로·대각선으로 정확히 두 칸 떨어지면 가운데 칸을 지배합니다.", "누군가 지배한 칸에는 돌을 놓을 수 없습니다. 양쪽이 동시에 지배하면 중립입니다."],
    win: "자기 돌과 자기만 지배하는 칸을 상하좌우로 이어 목표 가장자리를 연결하면 승리합니다.",
    tip: "다리 하나가 끊겨도 우회할 수 있도록 지배 칸이 겹치는 넓은 길을 만드세요.",
  },
  {
    id: "pursuit", number: "09", title: "추적", english: "PURSUIT", time: "6–10분", level: "입문",
    color: "#b77932", tagline: "싸움은 항상 마지막 돌 주변에서 벌어진다.",
    objective: "상대 돌 5개를 먼저 포획하세요.",
    summary: "상대의 직전 수 근처만 따라가며 양쪽에서 돌을 끼워 잡는 추격전.",
    setup: "첫 두 수는 자유롭게 둡니다. 이후 전투는 상대의 마지막 돌 주변에서만 이어집니다.",
    turns: ["상대가 방금 둔 돌에서 가로·세로 거리 2칸 이내의 빈칸에 둡니다.", "새 돌과 기존 자기 돌 사이에 상대 돌 하나가 정확히 끼면 그 돌을 잡습니다.", "한 수로 여러 방향의 돌을 동시에 잡을 수 있습니다."],
    win: "상대 돌을 누적 5개 먼저 포획하면 승리합니다. 24라운드 종료 시에는 포획 수가 높은 쪽이 이깁니다.",
    tip: "상대의 마지막 돌만 쫓지 말고, 다음 착점 범위 안에 미리 포획 축을 준비하세요.",
  },
  {
    id: "collapse", number: "10", title: "붕괴", english: "COLLAPSE", time: "7–12분", level: "상급",
    color: "#cf493e", tagline: "네 개를 잇는 순간, 주변까지 무너진다.",
    objective: "폭발로 상대 돌 5개를 먼저 제거하세요.",
    summary: "네 돌의 완성이 승리 대신 주변을 지우는 폭발 전술 게임.",
    setup: "빈 7×7 판에서 시작합니다. 제거한 상대 돌의 수가 점수가 됩니다.",
    turns: ["빈칸에 돌 하나를 놓습니다.", "방금 놓은 돌을 포함해 같은 색 4개가 가로·세로·대각선으로 이어지면 붕괴합니다.", "그 네 돌과 각 돌에 상하좌우로 붙은 모든 돌이 함께 제거됩니다."],
    win: "붕괴로 상대 돌을 누적 5개 먼저 제거하면 승리합니다. 22라운드 종료 시 점수가 높은 쪽이 이깁니다.",
    tip: "내 네 돌 주변에 상대 돌이 모였을 때 폭발해야 합니다. 너무 일찍 완성하면 공격 자원만 사라집니다.",
  },
];

export function createState(gameId) {
  return {
    gameId, board: Array.from({ length: SIZE }, () => Array(SIZE).fill(null)),
    turn: "black", moves: [], history: [], captures: { black: 0, white: 0 },
    winner: null, reason: "", lastMove: null, controls: {}, removed: [], log: [],
  };
}

export function snapshot(state) {
  const { history, ...data } = state;
  return clone(data);
}

export function restore(state, saved) {
  const history = state.history;
  Object.assign(state, clone(saved), { history });
}

export function legalMoves(state) {
  const moves = [];
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    if (isLegal(state, x, y)) moves.push({ x, y });
  }
  return moves;
}

function isLegal(state, x, y) {
  if (!inside(x, y) || at(state, x, y) || state.winner) return false;
  if (state.gameId === "echo" && state.lastMove) {
    const dx = Math.abs(x - state.lastMove.x), dy = Math.abs(y - state.lastMove.y);
    return dx === 0 || dy === 0 || dx === dy;
  }
  if (state.gameId === "balance") return balanceAfter(state, x, y);
  if (state.gameId === "bridge") return !controlOwner(state, x, y);
  if (state.gameId === "pursuit" && state.moves.length >= 2) {
    return Math.abs(x - state.lastMove.x) + Math.abs(y - state.lastMove.y) <= 2;
  }
  return true;
}

function place(state, x, y) {
  state.board[y][x] = { player: state.turn, order: state.moves.length + 1 };
  state.moves.push({ x, y, player: state.turn });
  state.lastMove = { x, y, player: state.turn };
}

function hasSquare(state, player) {
  const points = [];
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (at(state,x,y)?.player === player) points.push({x,y});
  const set = new Set(points.map((p) => key(p.x,p.y)));
  for (const a of points) for (const b of points) {
    if (a === b) continue;
    const dx = b.x-a.x, dy=b.y-a.y;
    const c={x:a.x-dy,y:a.y+dx}, d={x:b.x-dy,y:b.y+dx};
    if (set.has(key(c.x,c.y)) && set.has(key(d.x,d.y))) return true;
  }
  return false;
}

function squareThreatCount(state, player) {
  const occupied = new Set();
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)if(at(state,x,y)?.player===player)occupied.add(key(x,y));
  const threats=new Set(), points=[...occupied].map(k=>{const[x,y]=k.split(",").map(Number);return{x,y};});
  for(const a of points)for(const b of points){
    if(a.x===b.x&&a.y===b.y)continue;
    const dx=b.x-a.x,dy=b.y-a.y;
    for(const sign of[-1,1]){
      const c={x:a.x-sign*dy,y:a.y+sign*dx},d={x:b.x-sign*dy,y:b.y+sign*dx};
      if(!inside(c.x,c.y)||!inside(d.x,d.y))continue;
      const missing=[c,d].filter(p=>!occupied.has(key(p.x,p.y)));
      if(missing.length===1&&!at(state,missing[0].x,missing[0].y))threats.add(key(missing[0].x,missing[0].y));
    }
  }
  return threats.size;
}

export function resonanceLinks(state, player) {
  const stones=[];
  for(let y=0;y<SIZE;y++) for(let x=0;x<SIZE;x++) if(at(state,x,y)?.player===player) stones.push({x,y});
  const links=[];
  for(let i=0;i<stones.length;i++) for(let j=i+1;j<stones.length;j++) {
    if(Math.max(Math.abs(stones[i].x-stones[j].x),Math.abs(stones[i].y-stones[j].y))<=2) links.push({a:stones[i],b:stones[j]});
  }
  return links;
}

function connectedEdge(state, player, mode) {
  const stones=[];
  for(let y=0;y<SIZE;y++) for(let x=0;x<SIZE;x++) if(at(state,x,y)?.player===player) stones.push({x,y});
  const seen=new Set(), queue=stones.filter(p=>mode==="horizontal"?p.x===0:p.y===0);
  queue.forEach(p=>seen.add(key(p.x,p.y)));
  while(queue.length){
    const p=queue.shift();
    if(mode==="horizontal"?p.x===SIZE-1:p.y===SIZE-1)return true;
    for(const q of stones) if(!seen.has(key(q.x,q.y))&&Math.max(Math.abs(p.x-q.x),Math.abs(p.y-q.y))<=2){seen.add(key(q.x,q.y));queue.push(q);}
  }
  return false;
}

function pushLine(state, x, y, dx, dy, actor) {
  const nx=x+dx, ny=y+dy;
  if(!inside(nx,ny)||!at(state,nx,ny))return;
  const chain=[]; let cx=nx,cy=ny;
  while(inside(cx,cy)&&at(state,cx,cy)){chain.push({x:cx,y:cy,stone:at(state,cx,cy)});cx+=dx;cy+=dy;}
  for(let i=chain.length-1;i>=0;i--){
    const item=chain[i], tx=item.x+dx,ty=item.y+dy;
    state.board[item.y][item.x]=null;
    if(inside(tx,ty))state.board[ty][tx]=item.stone;
    else if(item.stone.player!==actor)state.captures[actor]++;
  }
}

function isolatedCount(state, player) {
  let count=0;
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)if(at(state,x,y)?.player===player&&![[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>at(state,x+dx,y+dy)))count++;
  return count;
}

function balanceAfter(state,x,y){
  let sx=x-3,sy=y-3;
  for(let yy=0;yy<SIZE;yy++)for(let xx=0;xx<SIZE;xx++)if(at(state,xx,yy)){sx+=xx-3;sy+=yy-3;}
  return Math.abs(sx)<=8&&Math.abs(sy)<=8;
}

function processThird(state){
  let changed=true,guard=0;
  while(changed&&guard++<20){
    changed=false;
    outer:for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)for(const[dx,dy]of[[1,0],[0,1],[1,1],[1,-1]]){
      const a=at(state,x,y),b=at(state,x+dx,y+dy),c=at(state,x+2*dx,y+2*dy);
      if(a&&b&&c&&a.player===b.player&&b.player===c.player){
        b.player=OTHER[b.player];changed=true;break outer;
      }
    }
  }
}

export function computeControls(state){
  const map={};
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
    const stone=at(state,x,y); if(!stone)continue;
    for(const[dx,dy]of DIRS){const end=at(state,x+2*dx,y+2*dy);if(end?.player===stone.player&&inside(x+dx,y+dy)){const k=key(x+dx,y+dy);map[k]??=new Set();map[k].add(stone.player);}}
  }
  return Object.fromEntries(Object.entries(map).map(([k,v])=>[k,v.size===1?[...v][0]:"neutral"]));
}

function controlOwner(state,x,y){return computeControls(state)[key(x,y)]||null;}

function bridgeWin(state,player){
  const controls=computeControls(state), valid=(x,y)=>at(state,x,y)?.player===player||controls[key(x,y)]===player;
  const q=[],seen=new Set();
  for(let i=0;i<SIZE;i++){const x=player==="black"?0:i,y=player==="black"?i:0;if(valid(x,y)){q.push({x,y});seen.add(key(x,y));}}
  while(q.length){const p=q.shift();if(player==="black"?p.x===SIZE-1:p.y===SIZE-1)return true;for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const x=p.x+dx,y=p.y+dy;if(inside(x,y)&&valid(x,y)&&!seen.has(key(x,y))){seen.add(key(x,y));q.push({x,y});}}}
  return false;
}

function pursuitCapture(state,x,y,player){
  for(const[dx,dy]of DIRS){const mid=at(state,x+dx,y+dy),end=at(state,x+2*dx,y+2*dy);if(mid?.player===OTHER[player]&&end?.player===player){state.board[y+dy][x+dx]=null;state.captures[player]++;}}
}

function collapse(state,x,y,player){
  const groups=[];
  for(const[dx,dy]of[[1,0],[0,1],[1,1],[1,-1]])for(let offset=-3;offset<=0;offset++){
    const cells=Array.from({length:4},(_,i)=>({x:x+(offset+i)*dx,y:y+(offset+i)*dy}));
    if(cells.every(p=>inside(p.x,p.y)&&at(state,p.x,p.y)?.player===player))groups.push(cells);
  }
  if(!groups.length)return false;
  const remove=new Set();
  groups.flat().forEach(p=>{remove.add(key(p.x,p.y));for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]])if(inside(p.x+dx,p.y+dy))remove.add(key(p.x+dx,p.y+dy));});
  for(const k of remove){const[rx,ry]=k.split(",").map(Number),stone=at(state,rx,ry);if(stone?.player===OTHER[player])state.captures[player]++;if(stone)state.board[ry][rx]=null;}
  state.removed=[...remove]; return true;
}

function finish(state,winner,reason){state.winner=winner;state.reason=reason;}

export function playMove(state,x,y){
  if(!isLegal(state,x,y))return {ok:false,message:"이 게임의 규칙상 둘 수 없는 자리입니다."};
  state.history.push(snapshot(state));
  const player=state.turn;
  place(state,x,y);
  let event="";
  if(state.gameId==="last"){
    const own=[];
    for(let sy=0;sy<SIZE;sy++)for(let sx=0;sx<SIZE;sx++){const stone=at(state,sx,sy);if(stone?.player===player)own.push({x:sx,y:sy,order:stone.order});}
    own.sort((a,b)=>a.order-b.order);
    if(own.length>5){const old=own[0];state.board[old.y][old.x]=null;event="가장 오래된 돌이 사라졌습니다.";}
    if(hasSquare(state,player))finish(state,player,"네 돌로 정사각형을 완성했습니다.");
  }
  if(state.gameId==="resonance"&&connectedEdge(state,player,player==="black"?"horizontal":"vertical"))finish(state,player,"목표한 두 가장자리를 연결했습니다.");
  if(state.gameId==="push"){
    for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]])pushLine(state,x,y,dx,dy,player);
    if(state.captures[player]>=4)finish(state,player,"상대 돌 4개를 판 밖으로 밀어냈습니다.");
  }
  if(state.gameId==="third"){processThird(state);if(hasSquare(state,player))finish(state,player,"변환 뒤 정사각형을 완성했습니다.");}
  if(state.gameId==="bridge"&&bridgeWin(state,player))finish(state,player,"돌과 다리로 목표 가장자리를 연결했습니다.");
  if(state.gameId==="pursuit"){
    pursuitCapture(state,x,y,player);
    if(state.captures[player]>=5)finish(state,player,"상대 돌 5개를 포획했습니다.");
  }
  if(state.gameId==="collapse"){
    if(collapse(state,x,y,player))event="붕괴가 일어나 주변 돌이 제거됐습니다.";
    if(state.captures[player]>=5)finish(state,player,"붕괴로 상대 돌 5개를 제거했습니다.");
  }
  const rounds=Math.ceil(state.moves.length/2);
  if(!state.winner&&state.gameId==="last"&&rounds>=30){
    const b=squareThreatCount(state,"black"),w=squareThreatCount(state,"white");
    finish(state,b===w?"draw":b>w?"black":"white",`정사각형 후보 ${b} 대 ${w}로 대국을 마쳤습니다.`);
  }
  if(!state.winner&&state.gameId==="push"&&rounds>=24){
    const b=state.captures.black,w=state.captures.white;
    finish(state,b===w?"draw":b>w?"black":"white",`밀어낸 돌 ${b} 대 ${w}로 대국을 마쳤습니다.`);
  }
  if(!state.winner&&state.gameId==="isolation"&&state.moves.length>=48){
    const b=isolatedCount(state,"black"),w=isolatedCount(state,"white");finish(state,b===w?"draw":b>w?"black":"white",`고립된 돌 ${b} 대 ${w}로 대국을 마쳤습니다.`);
  }
  if(!state.winner&&["pursuit","collapse"].includes(state.gameId)&&rounds>=(state.gameId==="pursuit"?24:22)){
    const b=state.captures.black,w=state.captures.white;finish(state,b===w?"draw":b>w?"black":"white",`포획 점수 ${b} 대 ${w}로 대국을 마쳤습니다.`);
  }
  state.log.unshift(`${player==="black"?"흑":"백"} · ${String.fromCharCode(65+x)}${SIZE-y}${event?` · ${event}`:""}`);
  state.turn=OTHER[player];
  if(!state.winner&&["echo","balance"].includes(state.gameId)&&legalMoves(state).length===0)finish(state,player,"상대가 더 이상 합법적인 수를 둘 수 없습니다.");
  if(!state.winner&&legalMoves(state).length===0)finish(state,player,"상대가 더 이상 놓을 수 있는 칸이 없습니다.");
  return {ok:true,event};
}

export function stats(state){
  const stones={black:0,white:0};for(const row of state.board)for(const stone of row)if(stone)stones[stone.player]++;
  if(state.gameId==="isolation")return {primary:{black:isolatedCount(state,"black"),white:isolatedCount(state,"white")},label:"고립된 돌"};
  if(["push","pursuit","collapse"].includes(state.gameId))return {primary:state.captures,label:"포획 점수"};
  if(state.gameId==="last")return {primary:stones,label:"살아 있는 돌"};
  return {primary:stones,label:"놓인 돌"};
}

export function overlays(state){
  return {
    legal:new Set(legalMoves(state).map(p=>key(p.x,p.y))),
    controls:state.gameId==="bridge"?computeControls(state):{},
    links:state.gameId==="resonance"?[...resonanceLinks(state,"black").map(l=>({...l,player:"black"})),...resonanceLinks(state,"white").map(l=>({...l,player:"white"}))]:[],
  };
}
