import "./styles.css";
import { GAMES, SIZE, createState, overlays, playMove, restore, stats } from "./engine.js";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const names = { black: "흑", white: "백", draw: "무승부" };
let selected = GAMES[0], state = createState(selected.id), muted = localStorage.getItem("tenfold-muted") === "true";
let audio;

function tone(kind) {
  if (muted) return;
  audio ||= new (window.AudioContext || window.webkitAudioContext)();
  const map={place:[260,180,.08],invalid:[130,90,.14],win:[340,760,.38],remove:[190,310,.18]};
  const [a,b,d]=map[kind]||map.place,o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;
  o.frequency.setValueAtTime(a,t);o.frequency.exponentialRampToValueAtTime(b,t+d);g.gain.setValueAtTime(.045,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(audio.destination);o.start();o.stop(t+d);
}

function card(game) {
  return `<article class="game-card" style="--accent:${game.color}" data-game="${game.id}">
    <div class="card-top"><span>${game.number}</span><small>${game.level}</small></div>
    <div class="card-art art-${game.id}"><i></i><i></i><i></i><i></i><i></i></div>
    <p>${game.english}</p><h3>${game.title}</h3><div class="card-rule">${game.summary}</div>
    <footer><span>${game.time}</span><button data-info="${game.id}">규칙 보기</button></footer>
  </article>`;
}

function renderLibrary() {
  $("#gameGrid").innerHTML=GAMES.map(card).join("");
}

function openGame(id) {
  selected=GAMES.find(g=>g.id===id);state=createState(id);
  $("#library").hidden=true;$("#playView").hidden=false;
  $("#gameNumber").textContent=`GAME ${selected.number} · ${selected.english}`;
  $("#gameTitle").textContent=selected.title;$("#gameTagline").textContent=selected.tagline;
  $("#objectiveText").textContent=selected.objective;
  document.documentElement.style.setProperty("--game-accent",selected.color);
  render();
}

function goLibrary(){ $("#playView").hidden=true;$("#library").hidden=false;$("#resultModal").classList.remove("active"); }

function buildBoard() {
  const board=$("#board");board.innerHTML="";
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
    const cell=document.createElement("button");cell.className="cell";cell.dataset.x=x;cell.dataset.y=y;
    cell.setAttribute("aria-label",`${String.fromCharCode(65+x)}${SIZE-y}`);board.append(cell);
  }
}

function point(p){return{x:50+p.x*100,y:50+p.y*100};}
function renderConnections(links){
  $("#connectionLayer").innerHTML=links.map(l=>{const a=point(l.a),b=point(l.b);return `<line class="link ${l.player}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;}).join("");
}

function renderBoard() {
  const overlay=overlays(state);
  $$(".cell").forEach(cell=>{
    const x=+cell.dataset.x,y=+cell.dataset.y,stone=state.board[y][x],control=overlay.controls[`${x},${y}`];
    cell.className="cell";
    if(overlay.legal.has(`${x},${y}`))cell.classList.add("legal");
    if(state.lastMove?.x===x&&state.lastMove?.y===y)cell.classList.add("last-move");
    if(state.removed?.includes(`${x},${y}`))cell.classList.add("removed");
    cell.innerHTML=stone?`<span class="stone ${stone.player}"><i>${selected.id==="last"?stone.order:""}</i></span>`:control?`<span class="control ${control}">${control==="neutral"?"×":""}</span>`:"";
  });
  renderConnections(overlay.links);
}

function renderStatus(){
  const data=stats(state);
  $("#blackPrimary").textContent=data.primary.black;$("#whitePrimary").textContent=data.primary.white;
  $("#blackSecondary").textContent=data.label;$("#whiteSecondary").textContent=data.label;
  $("#roundNumber").textContent=String(Math.max(1,Math.ceil((state.moves.length+1)/2))).padStart(2,"0");
  $("#turnStone").className=`turn-stone ${state.turn}`;$("#turnLabel").textContent=`${state.turn.toUpperCase()} TURN`;$("#turnText").textContent=`${names[state.turn]}의 차례`;
  const legal=overlays(state).legal.size;
  $("#actionHint").textContent=selected.id==="push"?"돌을 놓아 인접한 줄을 밀어내세요.":`둘 수 있는 자리 ${legal}곳`;
  $("#statusList").innerHTML=[
    ["진행",`${state.moves.length}수`],["가능한 수",`${legal}곳`],
    ...(selected.id==="last"?[["유지 한도","각 5개"]]:[]),
    ...(["push","pursuit","collapse"].includes(selected.id)?[["승리 점수",selected.id==="push"?"4점":"5점"]]:[])
  ].map(([a,b])=>`<div><span>${a}</span><b>${b}</b></div>`).join("");
  $("#moveLog").innerHTML=(state.log.length?state.log.slice(0,5):["아직 놓인 돌이 없습니다."]).map(v=>`<li>${v}</li>`).join("");
  $("#undoButton").disabled=!state.history.length;
}

function render(){renderBoard();renderStatus();if(state.winner)showResult();}

function move(x,y){
  const result=playMove(state,x,y);
  if(!result.ok){tone("invalid");toast(result.message);return;}
  tone(result.event?"remove":"place");render();
}

function toast(msg){const el=$("#toast");el.textContent=msg;el.classList.add("visible");setTimeout(()=>el.classList.remove("visible"),1800);}

function fillRules(game){
  $("#ruleNumber").textContent=`GAME ${game.number} · RULEBOOK`;$("#ruleTitle").textContent=game.title;
  $("#ruleSummary").innerHTML=`<b>${game.english}</b><p>${game.summary}</p><span>${game.time} · ${game.level}</span>`;
  $("#ruleSetup").textContent=game.setup;$("#ruleTurns").innerHTML=game.turns.map(v=>`<li>${v}</li>`).join("");
  $("#ruleWin").textContent=game.win;$("#ruleTip").textContent=game.tip;$("#drawerPlayButton").dataset.game=game.id;
}

function openRules(game=selected){fillRules(game);$("#rulesDrawer").classList.add("active");$("#rulesDrawer").setAttribute("aria-hidden","false");}
function closeRules(){$("#rulesDrawer").classList.remove("active");$("#rulesDrawer").setAttribute("aria-hidden","true");}

function showResult(){
  const winner=state.winner;$("#resultTitle").textContent=winner==="draw"?"무승부":`${names[winner]} 승리`;
  $("#resultReason").textContent=state.reason;$("#resultMark").className=`result-mark ${winner}`;
  $("#resultModal").classList.add("active");tone("win");
}

renderLibrary();buildBoard();
$("#gameGrid").addEventListener("click",e=>{
  const info=e.target.closest("[data-info]");if(info){e.stopPropagation();openRules(GAMES.find(g=>g.id===info.dataset.info));return;}
  const card=e.target.closest("[data-game]");if(card)openGame(card.dataset.game);
});
$("#board").addEventListener("click",e=>{const c=e.target.closest(".cell");if(c&&!state.winner)move(+c.dataset.x,+c.dataset.y);});
$("#backButton").addEventListener("click",goLibrary);$("#collectionButton").addEventListener("click",goLibrary);$("#brandButton").addEventListener("click",goLibrary);
$("#rulesButton").addEventListener("click",()=>openRules(selected));$("#sideRulesButton").addEventListener("click",()=>openRules(selected));
$$("[data-close-rules]").forEach(x=>x.addEventListener("click",closeRules));
$("#drawerPlayButton").addEventListener("click",e=>{closeRules();openGame(e.currentTarget.dataset.game);});
$("#restartButton").addEventListener("click",()=>{state=createState(selected.id);$("#resultModal").classList.remove("active");render();});
$("#rematchButton").addEventListener("click",()=>{state=createState(selected.id);$("#resultModal").classList.remove("active");render();});
$("#otherGameButton").addEventListener("click",goLibrary);
$("#undoButton").addEventListener("click",()=>{if(!state.history.length)return;const saved=state.history.pop();restore(state,saved);$("#resultModal").classList.remove("active");render();});
$("#soundButton").addEventListener("click",()=>{muted=!muted;localStorage.setItem("tenfold-muted",muted);$("#soundButton").classList.toggle("muted",muted);});
$("#soundButton").classList.toggle("muted",muted);
document.addEventListener("keydown",e=>{if(e.key==="Escape"){if($("#rulesDrawer").classList.contains("active"))closeRules();else if(!$("#playView").hidden)goLibrary();}});

if(["localhost","127.0.0.1"].includes(location.hostname)){
  window.__tenfold={GAMES,get state(){return state;},openGame,move};
  const preview=new URLSearchParams(location.search).get("game");if(preview)openGame(preview);
}
