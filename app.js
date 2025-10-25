// app.js — Diversión con el mundo (build estable)
// Funciones principales del juego + fixes de compatibilidad vitrina de logros

/* ========= Utilidades ========= */
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const randomInt = n => Math.floor(Math.random() * n);
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
const todayStr = () => new Date().toISOString().slice(0,10);

function isoWeekStringLocal(d=new Date()){
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayNum = (date.getDay() || 7);
  date.setDate(date.getDate() + 4 - dayNum);
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getFullYear()}-W${String(weekNo).padStart(2,'0')}`;
}

function flagUrl(code){ return `https://flagcdn.com/w320/${code}.png`; }
function regionBadge(r){ return r || 'Other'; }

/* ========= Config ========= */
const LEVELS = {
  kids:   { label: 'Niños',   time: 15, wrongPenalty: 0 },
  adult:  { label: 'Adultos', time: 12, wrongPenalty: 0 },
  master: { label: 'Máster',  time:  8, wrongPenalty: -5 },
};
const MAX_Q = 10;

// Supervivencia
const SURVIVAL_START = 20;
const SURVIVAL_BONUS = 2;

/* ========= Capitales ES (map) ========= */
const CAPITAL_ES = {
  "Amsterdam":"Ámsterdam","Athens":"Atenas","Berlin":"Berlín","Berne":"Berna","Bern":"Berna","Brussels":"Bruselas","Bucharest":"Bucarest","Budapest":"Budapest","Chisinau":"Chisináu","Copenhagen":"Copenhague","Dublin":"Dublín","Helsinki":"Helsinki","Kyiv":"Kiev","Kiev":"Kiev","Lisbon":"Lisboa","Ljubljana":"Liubliana","London":"Londres","Luxembourg":"Luxemburgo","Madrid":"Madrid","Minsk":"Minsk","Monaco":"Mónaco","Moscow":"Moscú","Nicosia":"Nicosia","Oslo":"Oslo","Paris":"París","Podgorica":"Podgorica","Prague":"Praga","Reykjavik":"Reikiavik","Riga":"Riga","Rome":"Roma","San Marino":"San Marino","Sarajevo":"Sarajevo","Skopje":"Skopie","Sofia":"Sofía","Stockholm":"Estocolmo","Tallinn":"Tallin","Tirana":"Tirana","Vaduz":"Vaduz","Valletta":"La Valeta","Vatican City":"Ciudad del Vaticano","Vienna":"Viena","Vilnius":"Vilna","Warsaw":"Varsovia","Zagreb":"Zagreb",
  "Abu Dhabi":"Abu Dabi","Amman":"Amán","Ankara":"Ankara","Astana":"Astaná","Baghdad":"Bagdad","Baku":"Bakú","Beijing":"Pekín","Peking":"Pekín","Beirut":"Beirut","Damascus":"Damasco","Dhaka":"Daca","Doha":"Doha","Hanoi":"Hanói","Islamabad":"Islamabad","Jakarta":"Yakarta","Jerusalem":"Jerusalén","Kabul":"Kabul","Kathmandu":"Katmandú","Kuala Lumpur":"Kuala Lumpur","Manila":"Manila","Muscat":"Mascate","New Delhi":"Nueva Delhi","Nur-Sultan":"Astaná","Phnom Penh":"Nom Pen","Riyadh":"Riad","Seoul":"Seúl","Singapore":"Singapur","Sri Jayawardenepura Kotte":"Sri Jayawardenapura Kotte","Taipei":"Taipéi","Tashkent":"Taskent","Tehran":"Teherán","Thimphu":"Timbu","Tokyo":"Tokio","Ulaanbaatar":"Ulán Bator","Vientiane":"Vientián","Sanaa":"Saná",
  "Canberra":"Canberra","Suva":"Suva","Wellington":"Wellington","Port Moresby":"Port Moresby","Apia":"Apia","Nukuʻalofa":"Nukualofa","Nuku'alofa":"Nukualofa","Honiara":"Honiara","Funafuti":"Funafuti",
  "Buenos Aires":"Buenos Aires","Asunción":"Asunción","Asuncion":"Asunción","Bogotá":"Bogotá","Brasília":"Brasilia","Brasilia":"Brasilia","Caracas":"Caracas","Georgetown":"Georgetown","Lima":"Lima","La Paz":"La Paz","Sucre":"Sucre","Montevideo":"Montevideo","Paramaribo":"Paramaribo","Quito":"Quito","Santiago":"Santiago",
  "Belmopan":"Belmopán","Guatemala City":"Ciudad de Guatemala","Havana":"La Habana","Kingston":"Kingston","Managua":"Managua","Mexico City":"Ciudad de México","Panama City":"Ciudad de Panamá","Port-au-Prince":"Puerto Príncipe","Port of Spain":"Puerto España","San Jose":"San José","San José":"San José","Santo Domingo":"Santo Domingo",
  "Ottawa":"Ottawa","Washington, D.C.":"Washington D. C.","Saint John's":"Saint John’s","St. John's":"Saint John’s",
  "Kuwait City":"Kuwait","Manama":"Manama","Majuro":"Majuro","Melekeok":"Melekeok","Ngerulmud":"Ngerulmud","Palikir":"Palikir","Tarawa":"Tarawa"
};
const toSpanishCapital = cap => cap ? (CAPITAL_ES[cap] || cap) : "";

/* ========= Estado ========= */
let ALL = []; // {code, nameES, capitalES, region, population}

let playerName = "";
let currentMode  = null;     // flags | capitals | mixed | survival | study | daily
let currentLevel = 'adult';
let currentTheme = 'all';    // all | Europe | Africa | Asia | Americas | Oceania

let optionsPool = [];
let order = [];
let idx = 0;

let score = 0, hits = 0, misses = 0;
let locked = false;
let paused = false;

let timeLeft = 0, timeInterval = null, nextTimer = null;
let qActiveStartMs = 0, qAccumulatedMs = 0;
let timesMs = [];
let missMap = {};
let streak = 0;

let muteFx = false;
let studyQueue = [];
let unlockedThisRun = new Set();

/* ========= LocalStorage ========= */
const LS = {
  name:'pro_player_name',
  scores:'pro_scores',
  stats:'pro_stats',
  challenge:'pro_challenges',
  last:'pro_last_sel',
  mute:'pro_mute',
  achievements:'pro_achievements',
  albums:'pro_albums_v2'
};

/* ========= Audio ========= */
const AudioCtx = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioCtx();
function playTone(f=440,d=0.12,type='sine',vol=0.2){
  if (muteFx) return;
  const o=audioCtx.createOscillator(); const g=audioCtx.createGain();
  o.type=type; o.frequency.value=f; g.gain.value=vol;
  o.connect(g).connect(audioCtx.destination); o.start();
  setTimeout(()=>{ g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime+0.05); o.stop(audioCtx.currentTime+0.06); }, d*1000);
}
function fxCorrect(){ let t=0; [{f:523,d:0.07},{f:659,d:0.07},{f:784,d:0.09}].forEach(n=>{ setTimeout(()=>playTone(n.f,n.d,'square',0.12), t); t+=n.d*1000*0.9; }); }
function fxWrong(){ const s=260,e=140,steps=6,ms=50; for(let i=0;i<steps;i++){ const f=s+(e-s)*(i/(steps-1)); setTimeout(()=>playTone(f, ms/1000,'sawtooth',0.12), i*ms); } }
function fxStreak(){ let t=0; [660,880,990,1180].forEach((f)=>{ setTimeout(()=>playTone(f,0.06,'triangle',0.13), t); t+=60; }); }

/* ========= Helpers Storage ========= */
function lsGet(k, def){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):def; }catch{ return def; } }
function lsSet(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} }

/* ========= Carga de datos ========= */
async function loadData(){
  try{
    const [resNames, resAll] = await Promise.all([
      fetch("https://flagcdn.com/es/codes.json"),
      fetch("https://restcountries.com/v3.1/all?fields=name,cca2,capital,region,population,translations")
    ]);
    const namesES = await resNames.json();
    const all = await resAll.json();
    ALL = all.map(c=>{
      const code = (c.cca2||"").toLowerCase();
      const nameES = (c.translations?.spa?.common) || namesES[code] || (c.name?.common||"");
      const capIn = Array.isArray(c.capital) && c.capital.length ? c.capital[0] : "";
      const capitalES = toSpanishCapital(capIn);
      const region = c.region || "Other";
      const population = c.population || 0;
      return { code, nameES, capitalES, region, population };
    }).filter(x=>x.code && x.nameES);
  }catch{
    // fallback mínimo offline
    ALL = [
      {code:"es",nameES:"España",capitalES:"Madrid",region:"Europe",population:47000000},
      {code:"fr",nameES:"Francia",capitalES:"París",region:"Europe",population:65000000},
      {code:"de",nameES:"Alemania",capitalES:"Berlín",region:"Europe",population:83000000},
      {code:"br",nameES:"Brasil",capitalES:"Brasilia",region:"Americas",population:210000000},
      {code:"us",nameES:"Estados Unidos",capitalES:"Washington D. C.",region:"Americas",population:330000000},
      {code:"jp",nameES:"Japón",capitalES:"Tokio",region:"Asia",population:126000000},
      {code:"za",nameES:"Sudáfrica",capitalES:"Pretoria",region:"Africa",population:58000000},
      {code:"au",nameES:"Australia",capitalES:"Canberra",region:"Oceania",population:25000000}
    ];
  }
}

/* ========= UI refs ========= */
const ui = {
  playerInput: $('#playerName'),
  goToMode: $('#goToMode'),
  backToPlayer: $('#backToPlayer'),
  startGame: $('#startGame'),

  selMode: $('#selMode'),
  selTheme: $('#selTheme'),
  selLevel: $('#selLevel'),

  hudPlayer: $('#hudPlayer'),
  hudMode: $('#hudMode'),
  hudTheme: $('#hudTheme'),

  qNumber: $('#qNumber'),
  qTotal: $('#qTotal'),
  points: $('#points'),
  hits: $('#hits'),
  misses: $('#misses'),
  progressBar: $('#progressBar'),
  timeLeft: $('#timeLeft'),
  timeBar: $('#timeBar'),

  flagImg: $('#flagImg'),
  capitalName: $('#capitalName'),
  flagImgReveal: $('#flagImgReveal'),
  countryReveal: $('#countryReveal'),

  whyFlag: $('#whyBoxFlag'),
  whyCap: $('#whyBoxCap'),

  finalPoints: $('#finalPoints'),
  finalHits: $('#finalHits'),
  finalMisses: $('#finalMisses'),
  achievementsList: $('#achievementsList'),

    // Logros (modal nuevo)
  achievementsModal: $('#achievementsModal'),
  closeAchievements: $('#closeAchievements'),
  achievementsGrid: $('#achievementsGrid'),
  achievementsEmpty: $('#achievementsEmpty'),
  achievementsBar: $('#achievementsBar'),
  achievementsPct: $('#achievementsPct'),


  // Álbum
  albumModal: $('#albumModal'),
  btnAlbum: $('#btnAlbum'),
  closeAlbum: $('#closeAlbum'),
  albumGrid: $('#albumGrid'),
  albumEmpty: $('#albumEmpty'),
  albumSearch: $('#albumSearch'),
  albumProgress: $('#albumProgress'),
  albumTrophies: $('#albumTrophies'),
  albumRegionChips: $('#albumRegionChips'),
  openAlbumFromFinal: $('#openAlbumFromFinal'),

  // Logros (modal antiguo — puede no existir) + vitrina nueva
  btnAchievements: $('#btnAchievements'),
  achModal: $('#achModal'),
  achGrid: $('#achGrid'),
  achEmpty: $('#achEmpty'),

  // Liga
  leagueModal: $('#leagueModal'),
  leagueWeek: $('#leagueWeek'),
  leagueTable: $('#leagueTable'),
  leagueName: $('#leagueName'),
};

/* ========= Pantallas ========= */
const screens = {
  player: $('#screen-player'),
  mode:   $('#screen-mode'),
  game:   $('#screen-game'),
  final:  $('#finalCard')
};

function showScreen(name){
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
  if (name==='mode') updateDailyTile();
}

/* ========= Mute persistente ========= */
(function initMute(){
  muteFx = lsGet(LS.mute, false);
  const btn = $('#btnMute');
  if (btn){
    btn.setAttribute('aria-pressed', String(muteFx));
    btn.textContent = muteFx ? '🔇' : '🔊';
    btn.addEventListener('click', ()=>{
      muteFx = !muteFx;
      lsSet(LS.mute, muteFx);
      btn.setAttribute('aria-pressed', String(muteFx));
      btn.textContent = muteFx ? '🔇' : '🔊';
    });
  }
})();

/* ========= Liga / Stats helpers ========= */
function recordGameToLeague({name, score, mode, level, theme, durationMs}){
  const arr = lsGet(LS.scores, []);
  arr.unshift({name, score, mode, level, theme, dateISO:new Date().toISOString(), week: isoWeekStringLocal(), durationMs});
  while(arr.length>300) arr.pop();
  lsSet(LS.scores, arr);
}

function updateGlobalStatsFromRun(){
  const st = lsGet(LS.stats, { times:{count:0,sumMs:0,maxMs:0,minMs:0}, countries:{} });
  for(const ms of timesMs){
    st.times.count += 1;
    st.times.sumMs += ms;
    st.times.maxMs = Math.max(st.times.maxMs||0, ms);
    st.times.minMs = st.times.minMs? Math.min(st.times.minMs, ms) : ms;
  }
  for(const code in missMap){
    const m = missMap[code];
    if(!st.countries[code]) st.countries[code] = {name:m.name, attempts:0, wrong:0};
    st.countries[code].attempts += m.attempts;
    st.countries[code].wrong += m.wrong;
  }
  lsSet(LS.stats, st);
}

/* ========= Logros (catálogo + helpers) ========= */
/* Catálogo base (puedes ampliarlo luego con los de tu Excel):
   - primeras veces: primer acierto, primera bandera, primera capital, primer juego por modo
   - rachas básicas: 3 y 5
   - algunos de ejemplo que ya tenías
*/
const ACH_CATALOG = [
  { id:'first_hit',      name:'¡Primer acierto!',             desc:'Tu primer acierto en el juego.',           icon:'🌟', cat:'Inicio' },
  { id:'first_flag',     name:'Primera bandera',              desc:'Acertaste tu primera bandera.',            icon:'🏳️', cat:'Inicio' },
  { id:'first_capital',  name:'Primera capital',              desc:'Acertaste tu primera capital.',            icon:'🏛️', cat:'Inicio' },
  { id:'first_flags',    name:'Estreno: Banderas',            desc:'Jugaste por primera vez el modo Banderas.',icon:'🚩', cat:'Modos' },
  { id:'first_capitals', name:'Estreno: Capitales',           desc:'Jugaste por primera vez el modo Capitales.',icon:'📍', cat:'Modos' },
  { id:'first_mixed',    name:'Estreno: Mixto',               desc:'Jugaste por primera vez el modo Mixto.',   icon:'🔀', cat:'Modos' },
  { id:'first_survival', name:'Estreno: Supervivencia',       desc:'Jugaste por primera vez Supervivencia.',   icon:'💀', cat:'Modos' },
  { id:'first_study',    name:'Estreno: Estudio',             desc:'Jugaste por primera vez Estudio.',         icon:'📚', cat:'Modos' },
  { id:'first_daily',    name:'Estreno: Reto del día',        desc:'Completaste tu primer Reto del día.',      icon:'🎯', cat:'Modos' },
  { id:'streak3',        name:'Racha 3',                      desc:'3 aciertos seguidos.',                     icon:'🔥', cat:'Rachas' },
  { id:'streak5',        name:'Racha 5',                      desc:'5 aciertos seguidos.',                     icon:'⚡', cat:'Rachas' },
  // Ejemplos que ya tenías:
  { id:'survival60',     name:'Supervivencia 60s',            desc:'Aguanta 60s en Supervivencia.',            icon:'⏳', cat:'Rachas' },
  { id:'euPerfect',      name:'Europa sin fallos',            desc:'Acaba Europa sin fallos.',                 icon:'🥇', cat:'Retos' },
  { id:'study10',        name:'Estudio aplicado',             desc:'Resuelve 10 en Estudio.',                  icon:'📘', cat:'Retos' }
];
const ACH_INDEX = Object.fromEntries(ACH_CATALOG.map(a=>[a.id,a]));

// Guardado
function getAchievements(){ return lsGet(LS.achievements, {}); }
function saveAchievements(obj){ lsSet(LS.achievements, obj); }
function unlockAchievement(id){
  if (!ACH_INDEX[id]) return; // evita ids desconocidos
  const all = getAchievements();
  if (all[id]) return;
  all[id] = { id, date: new Date().toISOString() };
  saveAchievements(all);
}

// Pintado de la vitrina (modal)
function renderAchievements(){
  const unlocked = getAchievements();
  // Mezcla: primero los desbloqueados, luego los bloqueados
  const sorted = [...ACH_CATALOG].sort((a,b)=>{
    const A = !!unlocked[a.id], B = !!unlocked[b.id];
    return (A===B) ? a.name.localeCompare(b.name,'es') : (A? -1 : 1);
  });

  // Progreso
  const total = ACH_CATALOG.length;
  const have = Object.keys(unlocked).length;
  const pct = total ? Math.round((have/total)*100) : 0;
  if (ui.achievementsBar) ui.achievementsBar.style.width = pct+'%';
  if (ui.achievementsPct) ui.achievementsPct.textContent = pct+'%';

  // Grid
  if (!ui.achievementsGrid) return;
  ui.achievementsGrid.innerHTML = sorted.map(a=>{
    const isOn = !!unlocked[a.id];
    const date = isOn ? new Date(unlocked[a.id].date).toLocaleString('es-ES') : '';
    const cls = isOn ? 'achv-card achv-unlocked' : 'achv-card achv-locked';
    return `
      <div class="${cls}" title="${isOn ? a.desc : 'Bloqueado'}">
        <div class="achv-art text-2xl">${a.icon||'🏅'}</div>
        <div class="achv-title">${a.name}</div>
        <div class="achv-cat">${a.cat||''}</div>
        ${isOn ? `<div class="text-[10px] text-slate-500 mt-1 text-center">${date}</div>`:''}
      </div>`;
  }).join('');

  // Vacío
  if (ui.achievementsEmpty){
    ui.achievementsEmpty.classList.toggle('hidden', Object.keys(unlocked).length>0);
  }
}

/* ========= Reto del día ========= */
function dailySeedIndex(max){
  const d = todayStr().replaceAll('-','');
  let h = 0; for(let i=0;i<d.length;i++){ h = (h*31 + d.charCodeAt(i)) % 2147483647; }
  return h % max;
}
function pickVeryHardSet(){
  const hardCodes = ["nr","tv","ws","to","ki","fm","mh","sb","pw","gd","ag","lc","vc","kn","bb","bz","gy","sr","gw","gn","ga","gq","bj","ne","td","cg","cd","bi","rw","er","dj","km","cv","st","bt","tm","kg","tj","la","bn","mm","af","ye","om","qa","bh","kw","mc","li","ad","sm","va","fo","ax"];
  const hardPool = ALL.filter(x=>hardCodes.includes(x.code));
  if(hardPool.length<4) return shuffle([...ALL]).slice(0,4);
  return shuffle(hardPool).slice(0,4);
}
function makeDailyQuestion(){
  const options = pickVeryHardSet();
  const idxSeed = dailySeedIndex(options.length);
  const correct = options[idxSeed];
  const useCapital = correct.capitalES && (idxSeed % 2 === 0);
  const mixed = shuffle([...options]);
  return { kind: useCapital?'capital':'flag', correct, options: mixed };
}
function updateDailyTile(){
  const challenges = lsGet(LS.challenge, {});
  const done = challenges[todayStr()];
  const tile = $("#tile-daily");
  if (tile) tile.style.display = done ? 'none' : '';
}
function obfuscateText(txt){
  const chars = txt.split(''); let letters = [];
  for(let i=0;i<chars.length;i++){ if(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(chars[i])) letters.push(i); }
  if(letters.length<=2) return txt;
  const hideCount = Math.max(2, Math.floor(letters.length*0.4));
  shuffle(letters); const toHide = new Set(letters.slice(0, hideCount));
  return chars.map((ch,i)=> toHide.has(i) ? ' _ ' : ch).join('');
}
function renderDailyModal(){
  const challenges = lsGet(LS.challenge, {});
  const done = challenges[todayStr()];
        // Logro: primer reto del día completado
      unlockAchievement('first_daily');
  const container = $("#dailyQuestion");
  $("#dailyPrize").classList.add("hidden");
  $("#dailyEmoji").textContent = "⭐";

  if(done){
    container.innerHTML = `<div class="p-4 rounded-xl border bg-emerald-50 text-sm">Ya hiciste el reto de hoy (${todayStr()}). Resultado: <strong>${done.correct? '✅ correcto' : '❌ incorrecto'}</strong>.</div>`;
    return;
  }
  const q = makeDailyQuestion();
  let html = "";
  if(q.kind==='flag'){
    html += `
      <div class="mb-3 text-sm text-slate-700">¿De qué país es esta bandera?</div>
      <div class="w-full max-h-64 overflow-hidden rounded-xl border bg-white mb-3 grid place-items-center p-2">
        <img src="${flagUrl(q.correct.code)}" class="max-h-60 w-auto object-contain" style="filter: blur(2px);" alt="Bandera (difuminada)" />
      </div>`;
  } else {
    const obsc = obfuscateText(q.correct.capitalES);
    html += `<div class="mb-3 text-sm text-slate-700">¿De qué país es la capital <strong>${obsc}</strong>?</div>`;
  }
  html += `<div class="grid grid-cols-1 gap-2">`;
  q.options.forEach((opt,i)=>{ html += `<button class="dailyOpt px-4 py-3 rounded-xl bg-white hover:bg-slate-50 border text-left font-semibold" data-code="${opt.code}">${i+1}) ${opt.nameES}</button>`; });
  html += `</div>`;
  container.innerHTML = html;

  $$(".dailyOpt").forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const chosenCode = btn.dataset.code;
      const correct = (chosenCode === q.correct.code);
      const challenges = lsGet(LS.challenge, {});
      challenges[todayStr()] = { name: playerName||'Anónimo', correct, score: correct? 10: 0 };
      lsSet(LS.challenge, challenges);

      $$(".dailyOpt").forEach((b)=>{
        b.classList.remove("bg-slate-50","hover:bg-slate-50","border");
        const isCorrect = b.dataset.code === q.correct.code;
        b.classList.add("border");
        if(isCorrect){ b.classList.add("bg-emerald-50","border-emerald-300"); }
        else if (b === btn){ b.classList.add("bg-rose-50","border-rose-300"); }
        else { b.classList.add("bg-slate-50","border-slate-200"); }
        b.disabled = true;
      });

      $("#dailyPrize").classList.remove("hidden");
      $("#dailyEmoji").textContent = correct ? "⭐" : "💤";
      if(correct){ fxCorrect(); } else { fxWrong(); }
      updateDailyTile();
    });
  });
}
/* ========= Tiempo y pausa ========= */
function startTimer(tRemain){
  clearInterval(timeInterval);
  const total = (typeof tRemain === 'number') ? tRemain : LEVELS[currentLevel].time;
  timeLeft = total;
  ui.timeLeft.textContent = Math.ceil(timeLeft);
  ui.timeBar.style.width = "100%";
  qActiveStartMs = Date.now();
  paused = false;

  timeInterval = setInterval(()=>{
    const elapsed = (Date.now()-qActiveStartMs)/1000;
    const remain = Math.max(0, total - elapsed);
    timeLeft = remain;
    ui.timeLeft.textContent = Math.ceil(remain);
    ui.timeBar.style.width = Math.max(0,(remain/LEVELS[currentLevel].time)*100) + "%";
    if (remain <= 0){
      clearInterval(timeInterval);
      handleTimeout();
    }
  }, 100);
}
function stopTimer(){ clearInterval(timeInterval); }
function pauseGame(){
  if (paused) return;
  paused = true;
  qAccumulatedMs += (Date.now() - qActiveStartMs);
  stopTimer();
  disableAnswers(true);
}
function resumeGame(){
  if (!paused) return;
  paused = false;
  qActiveStartMs = Date.now();
  startTimer(timeLeft);
  disableAnswers(false);
}
function disableAnswers(disabled){
  $$("#card-flag .answer-btn").forEach(b=> b.disabled = disabled);
  $$("#card-capital .answer-btn.cap").forEach(b=> b.disabled = disabled);
}

/* ========= Juego ========= */
function applyThemePool(){
  // FIX: tema "Mundo" devuelve todo el pool
  return currentTheme === 'all' ? [...ALL] : ALL.filter(x => x.region === currentTheme);
}
function pickOptions(correct, pool, n=4){
  const others = pool.filter(x=>x.code!==correct.code);
  shuffle(others);
  const fill = others.slice(0, Math.max(0, n-1));
  while (fill.length < n-1 && ALL.length){
    const cand = ALL[randomInt(ALL.length)];
    if (cand && cand.code!==correct.code && !fill.some(o=>o.code===cand.code)) fill.push(cand);
  }
  // FIX spread correcto
  return shuffle([correct, ...fill]);
}
function modeLabel(m){
  return m==='flags'?'Banderas':m==='capitals'?'Capitales':m==='mixed'?'Mixto':m==='survival'?'Supervivencia':m==='study'?'Estudio':m;
}
function makeOneQuestion(){
  const base = applyThemePool();
  const withCapital = base.filter(x=>x.capitalES && x.capitalES.trim().length);

  // Decide el tipo según el modo
  if (currentMode==='flags') {
    const item = base[randomInt(base.length)];
    return { kind:'flag', item };
  } else if (currentMode==='capitals') {
    const pool = withCapital.length ? withCapital : base;
    const item = pool[randomInt(pool.length)];
    return { kind:'capital', item };
  } else if (currentMode==='mixed' || currentMode==='survival') {
    const useCap = withCapital.length && Math.random()<0.5;
    const pool = useCap ? withCapital : base;
    const item = pool[randomInt(pool.length)];
    return { kind: useCap ? 'capital' : 'flag', item };
  } else {
    const item = base[randomInt(base.length)];
    return { kind:'flag', item };
  }
}

function newGame(){
  const base = applyThemePool();
  optionsPool = base.length ? base : [...ALL];
  shuffle(optionsPool);

order = [];
const withCapital = optionsPool.filter(x=>x.capitalES && x.capitalES.trim().length);

if (currentMode==='study'){
  ui.qTotal.textContent = '/∞';
} else if (currentMode==='survival'){
  // Supervivencia: sin tope; generamos bajo demanda
  ui.qTotal.textContent = '/∞';
  order.push(makeOneQuestion()); // primera pregunta
} else {
  ui.qTotal.textContent = '/'+MAX_Q;
  const count = MAX_Q;
  for (let i=0; i<count; i++){
    if (currentMode === 'flags') {
      order.push({ kind:'flag', item: optionsPool[i % optionsPool.length] });
    } else if (currentMode === 'capitals') {
      order.push({ kind:'capital', item: withCapital[i % withCapital.length] || optionsPool[i % optionsPool.length] });
    } else {
      const kind = (withCapital.length && Math.random()<0.5) ? 'capital' : 'flag';
      const baseK = (kind==='capital') ? (withCapital.length?withCapital:optionsPool) : optionsPool;
      order.push({ kind, item: baseK[i % baseK.length] });
    }
  }
}

  idx = 0; score = 0; hits = 0; misses = 0; locked = false;
  timesMs = []; missMap = {}; streak = 0; studyQueue = [];
  qAccumulatedMs = 0; paused = false;
  unlockedThisRun = new Set();

  ui.points.textContent = score; ui.hits.textContent = hits; ui.misses.textContent = misses;
  ui.qNumber.textContent = 1; ui.progressBar.style.width = "0%";
  ui.hudPlayer.textContent = playerName || 'Anónimo';
  ui.hudMode.textContent = modeLabel(currentMode);
  ui.hudTheme.textContent = (currentTheme==='all'?'Mundo':currentTheme);

  lsSet(LS.last, { mode: currentMode, level: currentLevel, theme: currentTheme });

  showScreen('game');
  renderQuestion();
}

function renderQuestion(){
  // Supervivencia: si hemos llegado al final del array, generamos la siguiente
  if (currentMode === 'survival' && idx >= order.length) {
    order.push(makeOneQuestion());
  }

  const q = order[idx];
  // Si aun así no hay pregunta válida, cerramos partida (evita quedarse en blanco)
  if (!q || !q.item) { endGame(false); return; }
 ui.whyFlag.textContent = ''; ui.whyCap.textContent = '';
  qAccumulatedMs = 0;

  if (q.kind === 'flag'){
    $("#card-flag").classList.remove('hidden');
    $("#card-capital").classList.add('hidden');
    ui.flagImg.src = flagUrl(q.item.code);
    ui.flagImg.alt = `Bandera de ${q.item.nameES}`;

    const opts = pickOptions(q.item, optionsPool, 4);
    $$("#card-flag .answer-btn").forEach((btn,i)=>{
      btn.textContent = opts[i].nameES;
      btn.dataset.correct = (opts[i].code===q.item.code) ? '1' : '0';
      btn.dataset.code = opts[i].code;
      btn.disabled = false;
      btn.className = "answer-btn px-4 py-3 rounded-xl bg-white hover:bg-slate-50 border text-left font-semibold";
    });
  } else {
    $("#card-flag").classList.add('hidden');
    $("#card-capital").classList.remove('hidden');
    ui.capitalName.textContent = q.item.capitalES || "—";
    ui.flagImgReveal.src = flagUrl(q.item.code);
    ui.countryReveal.textContent = `Es ${q.item.nameES}`;
    const base = optionsPool.filter(x=>x.capitalES && x.capitalES.trim().length);
    const opts = pickOptions(q.item, base.length?base:optionsPool, 4);
    $$("#card-capital .answer-btn.cap").forEach((btn,i)=>{
      btn.textContent = opts[i].nameES;
      btn.dataset.correct = (opts[i].code===q.item.code) ? '1' : '0';
      btn.dataset.code = opts[i].code;
      btn.disabled = false;
      btn.className = "answer-btn cap px-4 py-3 rounded-xl bg-white hover:bg-slate-50 border text-left font-semibold";
    });
    ui.flagImgReveal.classList.add('hidden');
    ui.countryReveal.classList.add('hidden');
  }

  locked = false;
  ui.qNumber.textContent = (currentMode==='study' ? (idx+1+studyQueue.length) : (idx+1));
  if (currentMode==='study'){ $('#timeBar').style.width = '0%'; ui.timeLeft.textContent = '∞'; }
  else if (currentMode==='survival'){ if (idx===0){ timeLeft = SURVIVAL_START; startSurvivalTimer(); } }
  else { startTimer(); }
}

function markButtons(buttons, targetBtn){
  buttons.forEach(btn=>{
    const isCorrect = btn.dataset.correct === "1";
    btn.classList.remove("bg-slate-50","border-slate-200");
    if (btn === targetBtn){
      if (isCorrect) btn.classList.add("bg-emerald-50","border","border-emerald-300");
      else btn.classList.add("bg-rose-50","border","border-rose-300");
    } else if (isCorrect){ btn.classList.add("bg-emerald-50","border","border-emerald-300"); }
    else { btn.classList.add("bg-slate-50","border","border-slate-200"); }
    btn.disabled = true;
  });
}
function whyText(country){
  const pop = country.population ? ` · Población aprox.: ${(country.population/1e6).toFixed(1)}M` : '';
  return `${country.nameES} — Región: ${regionBadge(country.region)}${pop}`;
}

/* ========= Álbum (estructura v2 por tipo) ========= */
function getAlbum(){ return lsGet(LS.albums, {}); }
function saveAlbum(obj){ lsSet(LS.albums, obj); }
function ensureAlbumEntry(country){
  const album = getAlbum();
  if(!album[country.code]){
    album[country.code] = {
      code: country.code,
      nameES: country.nameES,
      region: country.region || "Other",
      flag: { unlocked:false, hits:0 },
      capital: { unlocked:false, value: country.capitalES || "", hits:0 }
    };
    saveAlbum(album);
  }
  return album;
}
function markFlagLearned(country){
  const album = ensureAlbumEntry(country);
  const entry = album[country.code];
  if (!entry.flag.unlocked) { entry.flag.unlocked = true; entry.flag.unlockedAtISO = new Date().toISOString(); }
  entry.flag.hits = (entry.flag.hits||0) + 1;
  saveAlbum(album);
  unlockedThisRun.add(country.code);
}
function markCapitalLearned(country){
  const album = ensureAlbumEntry(country);
  const entry = album[country.code];
  if (!entry.capital.unlocked) { entry.capital.unlocked = true; entry.capital.unlockedAtISO = new Date().toISOString(); }
  entry.capital.value = country.capitalES || entry.capital.value || "";
  entry.capital.hits = (entry.capital.hits||0) + 1;
  saveAlbum(album);
  unlockedThisRun.add(country.code);
}

/* ========= Progreso por región ========= */
const REGION_KEYS = ["all","Europe","Asia","Americas","Oceania","Africa","Other"];
const REGION_LABELS = { all:"Mundo", Europe:"Europa", Asia:"Asia", Americas:"América", Oceania:"Oceanía", Africa:"África", Other:"Otras" };
const REGION_ICONS  = { all:"🌍",   Europe:"🧭",   Asia:"🏮",  Americas:"🗽",   Oceania:"🐚",    Africa:"🏜️",   Other:"🌋" };

function countTotalsByRegion(){
  const map = {};
  for(const key of REGION_KEYS){ map[key] = { total:0, flag:0, capital:0, both:0 }; }
  for(const c of ALL){
    const key = (c.region && REGION_KEYS.includes(c.region)) ? c.region : "Other";
    map[key].total += 1;
    map.all.total += 1;
  }
  const album = getAlbum();
  for(const code in album){
    const e = album[code];
    const k = (e.region && REGION_KEYS.includes(e.region)) ? e.region : "Other";
    const f = !!(e.flag && e.flag.unlocked);
    const cap = !!(e.capital && e.capital.unlocked);
    if (f){ map[k].flag+=1; map.all.flag+=1; }
    if (cap){ map[k].capital+=1; map.all.capital+=1; }
    if (f && cap){ map[k].both+=1; map.all.both+=1; }
  }
  return map;
}
function pct(part,total){ return total? Math.round((part/total)*100) : 0; }
function barHtml(label, val, total){
  const p = pct(val,total);
  return `
    <div class="flex items-center gap-2">
      <span class="text-[11px] w-16 text-slate-500">${label}</span>
      <div class="bar w-full"><span style="width:${p}%"></span></div>
      <span class="text-[11px] w-10 text-right font-semibold">${p}%</span>
    </div>`;
}

/* ========= Controles de región (chips) ========= */
function renderAlbumRegionChips(active='all'){
  const wrap = ui.albumRegionChips;
  const html = REGION_KEYS.map(k => `
    <button data-region="${k}" class="px-3 py-2 rounded-xl border bg-white hover:bg-slate-50 text-sm flex items-center gap-2 ${k===active?'ring-2 ring-emerald-400':''}">
      <span class="text-lg">${REGION_ICONS[k]}</span>
      <span class="font-semibold">${REGION_LABELS[k]}</span>
    </button>`).join('');
  wrap.innerHTML = html;
  $$("#albumRegionChips button").forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const r = btn.dataset.region;
      renderAlbum(r);
      $$("#albumRegionChips button").forEach(x=>x.classList.remove('ring-2','ring-emerald-400'));
      btn.classList.add('ring-2','ring-emerald-400');
    });
  });
}

/* ========= Estantería de insignias por región ========= */
function trophiesFromProgress(mp){
  const out = [];
  for (const k of ["Europe","Asia","Americas","Oceania","Africa","Other"]){
    const row = mp[k]; if(!row || !row.total) continue;
    const pAll = Math.round(((row.flag+row.capital)/Math.max(1,row.total*2))*100);
    let icon = "⬜", color = "bg-slate-100 text-slate-600", pulse=false, label = `${REGION_LABELS[k]} ${pAll}%`;
    if (pAll>=100){ icon="🥇"; color="bg-amber-100 text-amber-700"; pulse=true; }
    else if (pAll>=50){ icon="🥈"; color="bg-sky-100 text-sky-700"; }
    else if (pAll>=25){ icon="🎯"; color="bg-emerald-100 text-emerald-700"; }
    else if (pAll>=10){ icon="🧭"; color="bg-indigo-100 text-indigo-700"; }
    else if (pAll>0){ icon="🔥"; color="bg-rose-100 text-rose-700"; }
    out.push({ label, icon, color, pulse });
  }
  return out;
}
function renderAlbumTrophies(mp){
  const tro = trophiesFromProgress(mp);
  ui.albumTrophies.innerHTML = tro.map(t=>`
    <div class="rounded-2xl border p-3 text-center ${t.color} ${t.pulse?'badge-pulse':''}">
      <div class="text-2xl mb-1">${t.icon}</div>
      <div class="text-xs font-semibold">${t.label}</div>
    </div>`).join('');
}

/* ========= Progreso por región (módulo) ========= */
function renderAlbumProgress(){
  const mp = countTotalsByRegion();
  let html = `
    <div class="mb-2 text-sm font-semibold text-slate-700">Progreso por región</div>
    <div class="grid md:grid-cols-2 gap-3">`;
  for (const key of ["Europe","Asia","Americas","Oceania","Africa","Other"]){
    const row = mp[key];
    if (!row || row.total===0) continue;
    html += `
      <div class="rounded-2xl border bg-white p-3">
        <div class="flex items-center justify-between mb-2">
          <div class="font-bold flex items-center gap-2"><span class="text-xl">${REGION_ICONS[key]}</span>${REGION_LABELS[key]}</div>
          <div class="text-[11px] text-slate-500">Total: ${row.total}</div>
        </div>
        ${barHtml("Banderas", row.flag, row.total)}
        <div class="h-2"></div>
        ${barHtml("Capitales", row.capital, row.total)}
      </div>`;
  }
  html += `</div>
  <div class="mt-3 p-3 rounded-2xl bg-slate-50 border text-sm flex items-center gap-3">
    <span class="text-2xl">🏆</span>
    <div class="flex-1">
      <div class="font-semibold">Mundo</div>
      ${barHtml("Banderas", mp.all.flag, mp.all.total)}
      <div class="h-2"></div>
      ${barHtml("Capitales", mp.all.capital, mp.all.total)}
    </div>
    <span class="inline-flex items-center gap-1 text-amber-600 font-bold text-sm badge-pulse">★ Insignia global</span>
  </div>`;
  ui.albumProgress.innerHTML = html;
  renderAlbumTrophies(mp);
  return mp;
}

/* ========= Álbum: grid tipo Pokédex ========= */
let albumActiveRegion = 'all';
function renderAlbum(region=albumActiveRegion){
  albumActiveRegion = region;
  const album = getAlbum();
  const values = Object.values(album);
  const q = (ui.albumSearch.value||"").toLowerCase().trim();

  const worldIndex = {}; for(const c of ALL){ worldIndex[c.code]=c; }

  const filtered = values
    .filter(x => region==='all' ? true : (x.region===region))
    .filter(x => !q ? true : (
      (x.nameES||"").toLowerCase().includes(q) ||
      (x.capital?.value||"").toLowerCase().includes(q)
    ))
    .filter(x => (x.flag?.unlocked || x.capital?.unlocked))
    .sort((a,b)=> (a.nameES||"").localeCompare(b.nameES||"","es"));

  ui.albumGrid.innerHTML = filtered.map(it=>{
    const showFlag = it.flag?.unlocked;
    const showCap = it.capital?.unlocked && (it.capital?.value || '').trim().length;
    const hitsFlag = it.flag?.hits || 0;
    const hitsCap = it.capital?.hits || 0;
    const locked = !showFlag && !showCap;
    const partially = (showFlag && !showCap) || (!showFlag && showCap);

    const pop = worldIndex[it.code]?.population || 0;
    const regionName = REGION_LABELS[it.region] || it.region;

    const flagBlock = showFlag ? `
      <div class="mt-2 aspect-video rounded-xl border grid place-items-center bg-white shine">
        <img src="${flagUrl(it.code)}" alt="Bandera de ${it.nameES}" class="max-h-full max-w-full object-contain" />
      </div>` : `
      <div class="mt-2 aspect-video rounded-xl border grid place-items-center bg-slate-100">
        <span class="text-3xl opacity-40">❓</span>
      </div>`;

    const capitalBlock = showCap ? `
      <div class="mt-2 text-base sm:text-lg font-extrabold text-slate-800 leading-snug">${it.capital.value}</div>` : `
      <div class="mt-2 text-sm text-slate-400">Capital oculta</div>`;

    return `
    <div class="flip rounded-2xl bg-white border shadow-sm overflow-hidden">
      <div class="flip-inner">
        <!-- Front -->
        <div class="flip-face p-3">
          <div class="flex items-start justify-between gap-2">
            <h4 class="font-bold text-sm">${it.nameES}</h4>
            <span class="text-[10px] px-2 py-0.5 rounded-full border bg-slate-50">${regionName}</span>
          </div>
          ${flagBlock}
          ${capitalBlock}
          <div class="mt-2 text-[11px] text-slate-500 flex items-center gap-2">
            ${showFlag ? `<span>🏳️ x${hitsFlag}</span>`:''}
            ${showCap ? `<span>🏛️ x${hitsCap}</span>`:''}
            ${partially ? `<span class="ml-auto inline-flex items-center gap-1 text-amber-600 font-semibold">★ Parcial</span>` : ''}
            ${(!locked && !partially) ? `<span class="ml-auto inline-flex items-center gap-1 text-emerald-600 font-semibold">✔ Completado</span>` : ''}
          </div>
        </div>
        <!-- Back -->
        <div class="flip-face flip-back p-3 bg-slate-50 border-t">
          <div class="text-xs text-slate-600">
            <div><span class="font-semibold">Población:</span> ${Math.round(pop/1e6)}M</div>
            <div><span class="font-semibold">Región:</span> ${regionName}</div>
            <div class="mt-2 text-[11px] text-slate-500">Pasa el ratón / pulsa para girar</div>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');

  ui.albumEmpty.classList.toggle('hidden', filtered.length>0);

  // Progreso + trofeos
  renderAlbumProgress();
}

/* ========= Selección / respuesta ========= */
function onSelect(e){
          // Logros "primeras veces"
      unlockAchievement('first_hit');
      unlockAchievement('first_flag');
  if (locked || paused) return;
  locked = true;
  if (currentMode!=='study') { qAccumulatedMs += (Date.now() - qActiveStartMs); stopTimer(); }

  const btn = e.currentTarget;
  const correct = btn.dataset.correct === "1";
  const q = order[idx];

  if(!missMap[q.item.code]) missMap[q.item.code] = {name: q.item.nameES, attempts:0, wrong:0};
  missMap[q.item.code].attempts += 1;

  if (q.kind === 'flag'){
    if (correct){
      score += 10; hits += 1; streak += 1; fxCorrect();
      ui.whyFlag.textContent = whyText(q.item);
      markFlagLearned(q.item);
    } else {
      misses += 1; streak = 0; missMap[q.item.code].wrong += 1;
      if (currentMode!=='study' && LEVELS[currentLevel].wrongPenalty<0) score = Math.max(0, score + LEVELS[currentLevel].wrongPenalty);
      fxWrong();
      if(currentMode==='study'){ studyQueue.push({ ...q }); }
    }
    ui.points.textContent = score; ui.hits.textContent = hits; ui.misses.textContent = misses;
    markButtons($$("#card-flag .answer-btn"), btn);
  } else {
    if (correct){
      score += 10; hits += 1; streak += 1; fxCorrect();
      ui.flagImgReveal.classList.remove('hidden'); ui.countryReveal.classList.remove('hidden');
      ui.whyCap.textContent = whyText(q.item);
      markCapitalLearned(q.item);
    } else {
      misses += 1; streak = 0; missMap[q.item.code].wrong += 1;
      if (currentMode!=='study' && LEVELS[currentLevel].wrongPenalty<0) score = Math.max(0, score + LEVELS[currentLevel].wrongPenalty);
      fxWrong();
      ui.flagImgReveal.classList.remove('hidden'); ui.countryReveal.classList.remove('hidden');
      if(currentMode==='study'){ studyQueue.push({ ...q }); }
    }
    ui.points.textContent = score; ui.hits.textContent = hits; ui.misses.textContent = misses;
    markButtons($$("#card-capital .answer-btn.cap"), btn);
  }

  if (streak===3) unlockAchievement('streak3');
  if (streak===5) { unlockAchievement('streak5'); fxStreak(); }

  if (currentMode==='survival'){
    if (!correct){ endGame(true); return; }
    else { timeLeft += SURVIVAL_BONUS; }
  }

  if (currentMode!=='study') timesMs.push(qAccumulatedMs);
  advanceProgress();
  scheduleNext();
}

function handleTimeout(){
  if (locked) return;
  locked = true;
  qAccumulatedMs += (Date.now() - qActiveStartMs);
  timesMs.push(qAccumulatedMs);
  const q = order[idx];

  if(!missMap[q.item.code]) missMap[q.item.code] = {name: q.item.nameES, attempts:0, wrong:0};
  missMap[q.item.code].attempts += 1;
  missMap[q.item.code].wrong += 1;

  if (currentMode==='survival'){ fxWrong(); endGame(true); return; }

  const { wrongPenalty } = LEVELS[currentLevel];
  if (wrongPenalty < 0) score = Math.max(0, score + wrongPenalty);
  misses += 1; streak = 0;
  ui.points.textContent = score; ui.misses.textContent = misses;

  if (q.kind === 'flag'){
    markButtons($$("#card-flag .answer-btn"), null);
    ui.whyFlag.textContent = whyText(q.item);
  } else {
    ui.flagImgReveal.classList.remove('hidden'); ui.countryReveal.classList.remove('hidden');
    markButtons($$("#card-capital .answer-btn.cap"), null);
    ui.whyCap.textContent = whyText(q.item);
  }
  fxWrong();
  advanceProgress();
  scheduleNext();
}

function advanceProgress(){
  if (currentMode==='survival') {
    // Sin tope fijo: barra indeterminada
    ui.progressBar.style.width = '0%';
  } else if (currentMode==='study'){
    ui.progressBar.style.width = '0%';
  } else {
    ui.progressBar.style.width = (((idx + 1) / MAX_Q) * 100) + "%";
  }
}
function scheduleNext(){ if(nextTimer){ clearTimeout(nextTimer); } nextTimer = setTimeout(nextQuestion, 700); }
function nextQuestion(){
  // SUPER VIVENCIA: sin límite de 10, solo termina por fallo/tiempo.
  if (currentMode === 'survival') {
    idx++;                 // avanzamos índice
    renderQuestion();      // generación bajo demanda ocurrirá en renderQuestion()
    return;
  }

  // RESTO MODOS: al llegar al límite/fin del array, finalizamos
  if (idx >= order.length || idx >= (MAX_Q || 10)) { endGame(false); return; }

  if (currentMode === 'study'){
    if (idx >= order.length || idx >= (MAX_Q || 10)) { endGame(false); return; }
    if (idx < order.length - 1){ idx++; }
    else if (studyQueue.length){ order.push(studyQueue.shift()); idx++; }
    else { endGame(false); return; }
    renderQuestion();
    return;
  }

  if (idx < MAX_Q - 1){ idx++; renderQuestion(); } else { endGame(false); }
}



/* ========= Supervivencia ========= */
let survivalInterval = null;
let timeSurvivedSec = 0;
function startSurvivalTimer(){
  stopSurvivalTimer();
  ui.timeLeft.textContent = Math.ceil(timeLeft);
  ui.timeBar.style.width = "100%";
  qActiveStartMs = Date.now();
  timeSurvivedSec = 0;
  survivalInterval = setInterval(()=>{
    timeLeft = Math.max(0, timeLeft - 0.1);
    timeSurvivedSec += 0.1;
    ui.timeLeft.textContent = Math.ceil(timeLeft);
    ui.timeBar.style.width = Math.max(0, (timeLeft / SURVIVAL_START) * 100) + "%";
    if (timeLeft<=0){ fxWrong(); endGame(true); }
  }, 100);
}
function stopSurvivalTimer(){ if (survivalInterval) { clearInterval(survivalInterval); survivalInterval=null; } }

function endGame(){
  stopTimer(); stopSurvivalTimer(); if(nextTimer){ clearTimeout(nextTimer); nextTimer=null; }
  ui.finalPoints.textContent = score;
  ui.finalHits.textContent = hits;
  ui.finalMisses.textContent = misses;

  if (currentMode==='survival' && timeSurvivedSec>=60) unlockAchievement('survival60');
  if (currentTheme==='Europe' && misses===0) unlockAchievement('europePerfect');
  if (currentMode==='study' && (hits>=10)) unlockAchievement('study10');

  const ach = listAchievements();
  ui.achievementsList.innerHTML = ach.length ? ach.map(a=>`<span class="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold" title="${a.desc}">🏅 ${a.name}</span>`).join('') : `<span class="text-slate-500 text-sm">Sin logros aún.</span>`;

  if (unlockedThisRun.size > 0) { ui.openAlbumFromFinal.classList.remove('hidden'); }
  else { ui.openAlbumFromFinal.classList.add('hidden'); }

  showScreen('final');

  const durationMs = timesMs.reduce((a,b)=>a+b,0);
  recordGameToLeague({name: playerName||'Anónimo', score, mode: modeLabel(currentMode), level: currentLevel, theme: currentTheme, durationMs});
  updateGlobalStatsFromRun();
}
/* ========= Liga ========= */
function renderLeague(){
  const scores = lsGet(LS.scores, []);
  const week = isoWeekStringLocal();
  ui.leagueWeek.textContent = week;

  const byPlayer = {};
  scores.filter(s => s.week===week).forEach(s=>{
    if(!byPlayer[s.name] || s.score > byPlayer[s.name].score){ byPlayer[s.name] = s; }
  });
  const rows = Object.values(byPlayer).sort((a,b)=> b.score - a.score).slice(0,50);

  if (!rows.length){
    ui.leagueTable.innerHTML = `<div class="p-4 rounded-xl border bg-slate-50 text-sm text-slate-600">Aún no hay partidas registradas esta semana.</div>`;
    return;
  }

  const html = `
    <table class="w-full text-sm">
      <thead><tr class="text-left text-slate-500">
        <th class="py-2 pr-2">#</th><th class="py-2 pr-2">Jugador</th><th class="py-2 pr-2">Puntos</th>
        <th class="py-2 pr-2">Modo</th><th class="py-2 pr-2">Nivel</th><th class="py-2 pr-2">Tema</th><th class="py-2 pr-2">Duración</th>
      </tr></thead>
      <tbody>
        ${rows.map((r,i)=>`
          <tr class="border-t">
            <td class="py-2 pr-2 font-semibold">${i+1}</td>
            <td class="py-2 pr-2">${r.name}</td>
            <td class="py-2 pr-2 font-bold">${r.score}</td>
            <td class="py-2 pr-2">${r.mode}</td>
            <td class="py-2 pr-2">${r.level}</td>
            <td class="py-2 pr-2">${r.theme==='all'?'Mundo':r.theme}</td>
            <td class="py-2 pr-2">${Math.round((r.durationMs||0)/1000)}s</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
  ui.leagueTable.innerHTML = html;

  ui.leagueName.value = playerName || '';
}

/* ========= Estadísticas ========= */
function msToStr(ms){ const s=Math.round(ms/1000); return s+'s'; }
function renderStats(tab='overview'){
  const st = lsGet(LS.stats, { times:{count:0,sumMs:0,maxMs:0,minMs:0}, countries:{} });
  const ach = listAchievements();

  if (tab==='overview'){
    const avg = st.times.count ? (st.times.sumMs/st.times.count) : 0;
    $('#statsContent').innerHTML = `
      <div class="grid sm:grid-cols-3 gap-3">
        <div class="rounded-xl border p-3 bg-slate-50/50"><div class="text-xs text-slate-500">Respuestas registradas</div><div class="text-2xl font-extrabold">${st.times.count}</div></div>
        <div class="rounded-xl border p-3 bg-slate-50/50"><div class="text-xs text-slate-500">Tiempo medio</div><div class="text-2xl font-extrabold">${msToStr(avg)}</div></div>
        <div class="rounded-xl border p-3 bg-slate-50/50"><div class="text-xs text-slate-500">Logros</div><div class="text-2xl font-extrabold">${ach.length}</div></div>
      </div>`;
    return;
  }

  if (tab==='mistakes'){
    // FIX: spread ...v correcto
    const arr = Object.entries(st.countries||{}).map(([code, v]) => ({ code, ...v, rate: (v.wrong||0)/Math.max(1,(v.attempts||0)) }))
      .filter(x=>x.attempts>2).sort((a,b)=> b.rate - a.rate).slice(0,15);
    $('#statsContent').innerHTML = arr.length ? `
      <table class="w-full text-sm">
        <thead><tr class="text-left text-slate-500"><th class="py-2 pr-2">País</th><th class="py-2 pr-2">Intentos</th><th class="py-2 pr-2">Fallos</th><th class="py-2 pr-2">% fallo</th></tr></thead>
        <tbody>${arr.map(r=>`<tr class="border-t"><td class="py-2 pr-2">${r.name}</td><td class="py-2 pr-2">${r.attempts}</td><td class="py-2 pr-2">${r.wrong}</td><td class="py-2 pr-2">${(r.rate*100).toFixed(0)}%</td></tr>`).join('')}</tbody>
      </table>` : `<div class="p-4 rounded-xl border bg-slate-50 text-sm text-slate-600">Aún no hay datos suficientes.</div>`;
    return;
  }

  if (tab==='times'){
    const c = st.times;
    $('#statsContent').innerHTML = `
      <div class="grid sm:grid-cols-3 gap-3">
        <div class="rounded-xl border p-3 bg-slate-50/50"><div class="text-xs text-slate-500">Respuestas</div><div class="text-2xl font-extrabold">${c.count||0}</div></div>
        <div class="rounded-xl border p-3 bg-slate-50/50"><div class="text-xs text-slate-500">Total</div><div class="text-2xl font-extrabold">${msToStr(c.sumMs||0)}</div></div>
        <div class="rounded-xl border p-3 bg-slate-50/50"><div class="text-xs text-slate-500">Máx / Mín</div><div class="text-2xl font-extrabold">${msToStr(c.maxMs||0)} / ${msToStr(c.minMs||0)}</div></div>
      </div>`;
    return;
  }

  if (tab==='achievements'){
    $('#statsContent').innerHTML = ach.length ? ach.map(a=>`
      <div class="rounded-xl border p-3 bg-emerald-50/50 mb-2">
        <div class="font-bold">🏅 ${a.name}</div>
        <div class="text-xs text-slate-600">${a.desc}</div>
        <div class="text-[11px] text-slate-500 mt-1">${new Date(a.date).toLocaleString('es-ES')}</div>
      </div>`).join('') : `<div class="p-4 rounded-xl border bg-slate-50 text-sm text-slate-600">Aún no has desbloqueado logros.</div>`;
  }
}

/* ========= Logros (modal viejo → vitrina nueva) ========= */
function renderAchievementsModal(){
  const modal = document.getElementById('achModal');
  const grid  = document.getElementById('achGrid');
  const empty = document.getElementById('achEmpty');

  // Si ya no existe el modal viejo, redirigimos a la vitrina nueva
  if (!modal || !grid) {
    const section = document.getElementById('achievementsSection');
    if (section) {
      section.classList.remove('hidden');
      if (typeof renderAchievements === 'function') renderAchievements();
    }
    return;
  }

  const ach = listAchievements();
  if (!ach.length){
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  const palette = { bronce:'bg-amber-100 text-amber-800', plata:'bg-slate-100 text-slate-700', oro:'bg-yellow-100 text-yellow-800' };
  grid.innerHTML = ach.map(a=>`
    <div class="rounded-2xl border p-4 ${palette[a.tier]||'bg-slate-100 text-slate-700'} shadow-sm">
      <div class="flex items-start gap-3">
        <div class="text-3xl">${a.icon || '🏅'}</div>
        <div>
          <div class="font-bold">${a.name}</div>
          <div class="text-sm opacity-80">${a.desc||''}</div>
          <div class="text-[11px] opacity-60 mt-1">${new Date(a.date).toLocaleString('es-ES')}</div>
        </div>
      </div>
    </div>`).join('');
}

/* ========= Eventos UI ========= */
// Inicio
ui.goToMode.addEventListener('click', ()=>{
  playerName = ui.playerInput.value.trim() || 'Anónimo';
  lsSet(LS.name, playerName);
  showScreen('mode');
});
ui.backToPlayer.addEventListener('click', ()=> showScreen('player'));

// Selecciones
$$('.mode-btn').forEach(b=>{
  b.addEventListener('click', ()=>{
    const m = b.dataset.mode;
    if (m==='daily'){ renderDailyModal(); $("#dailyModal").showModal(); return; }
    currentMode = m;
    $$('.mode-btn').forEach(x=>x.classList.remove('ring-2','ring-sky-400'));
    b.classList.add('ring-2','ring-sky-400');
    ui.selMode.textContent = modeLabel(currentMode);
  });
});
$$('.theme-btn').forEach(b=>{
  b.addEventListener('click', ()=>{
    currentTheme = b.dataset.theme;
    $$('.theme-btn').forEach(x=>x.classList.remove('ring-2','ring-emerald-400'));
    b.classList.add('ring-2','ring-emerald-400');
    ui.selTheme.textContent = currentTheme==='all'?'Mundo':currentTheme;
  });
});
$$('.level-btn').forEach(b=>{
  b.addEventListener('click', ()=>{
    currentLevel = b.dataset.level;
    $$('.level-btn').forEach(x=>x.classList.remove('ring-2','ring-amber-400'));
    b.classList.add('ring-2','ring-amber-400');
    ui.selLevel.textContent = LEVELS[currentLevel]?.label || '—';
  });
});

// Jugar
ui.startGame.addEventListener('click', ()=>{
  if (!currentMode || currentMode==='daily'){ alert('Elige un modo (excepto Reto del día)'); return; }
  if (!currentTheme){ alert('Elige un tema'); return; }
  if (!currentLevel && currentMode!=='survival' && currentMode!=='study'){ alert('Elige dificultad'); return; }
  try{ audioCtx.resume(); }catch{}
    // Logros "primer juego por modo"
  if (currentMode==='flags')      unlockAchievement('first_flags');
  else if (currentMode==='capitals')  unlockAchievement('first_capitals');
  else if (currentMode==='mixed')     unlockAchievement('first_mixed');
  else if (currentMode==='survival')  unlockAchievement('first_survival');
  else if (currentMode==='study')     unlockAchievement('first_study');
  newGame();
});

// Juego controls
$('#restartBtn').addEventListener('click', ()=>{ stopTimer(); stopSurvivalTimer(); if(nextTimer){ clearTimeout(nextTimer); nextTimer=null; } newGame(); });
$('#restartBtn2').addEventListener('click', ()=>{ stopTimer(); stopSurvivalTimer(); if(nextTimer){ clearTimeout(nextTimer); nextTimer=null; } newGame(); });
$('#exitBtn').addEventListener('click', ()=>{ stopTimer(); stopSurvivalTimer(); if(nextTimer){ clearTimeout(nextTimer); nextTimer=null; } showScreen('mode'); });
$('#exitBtn2').addEventListener('click', ()=>{ stopTimer(); stopSurvivalTimer(); if(nextTimer){ clearTimeout(nextTimer); nextTimer=null; } showScreen('mode'); });

// Atajos y pausa
$('#pauseBtn').addEventListener('click', ()=> pauseGame());
$('#pauseBtn2').addEventListener('click', ()=> pauseGame());
document.addEventListener('keydown', (e)=>{
  if(screens.game.classList.contains('active')){
    if(['1','2','3','4'].includes(e.key)){
      const pick = parseInt(e.key,10)-1;
      const pool = $("#card-flag").classList.contains('hidden') ? $$("#card-capital .answer-btn.cap") : $$("#card-flag .answer-btn");
      if(pool[pick] && !pool[pick].disabled) pool[pick].click();
    }
    if(e.key.toLowerCase()==='p') pauseGame();
  }
});

// Final
$('#playAgainBtn').addEventListener('click', ()=> newGame());
$('#goHomeBtn').addEventListener('click', ()=>{ stopTimer(); stopSurvivalTimer(); showScreen('mode'); });
$('#shareResult').addEventListener('click', ()=>{
  const text = `🏆 ${playerName} · ${modeLabel(currentMode)} (${LEVELS[currentLevel]?.label||'—'} · ${currentTheme==='all'?'Mundo':currentTheme}) · ${score} puntos · ${isoWeekStringLocal()}`;
  if(navigator.share) navigator.share({text}).catch(()=>{ navigator.clipboard.writeText(text); alert("Copiado"); });
  else { navigator.clipboard.writeText(text); alert("Copiado"); }
});
ui.openAlbumFromFinal?.addEventListener('click', ()=>{
  $('#albumModal').showModal();
  renderAlbumRegionChips('all');
  renderAlbum('all');
});

/* ========= Modales & tabs ========= */
$('#helpBtn').addEventListener('click', ()=> $("#helpModal").showModal());
$('#closeHelp').addEventListener('click', ()=> $("#helpModal").close());

// Liga
$('#btnLeague').addEventListener('click', ()=>{ renderLeague(); $("#leagueModal").showModal(); });
$('#closeLeague').addEventListener('click', ()=> $("#leagueModal").close());
$('#saveLeagueName').addEventListener('click', ()=>{ const n=$('#leagueName').value.trim(); if(n){ playerName=n; lsSet(LS.name, playerName); $('#hudPlayer').textContent=playerName; } });
$('#resetLeague').addEventListener('click', ()=>{ if(confirm('¿Borrar ranking y estadísticas locales?')){ localStorage.removeItem(LS.scores); localStorage.removeItem(LS.stats); renderLeague(); } });
// Stats (robusto) — pegar justo debajo de los handlers de "Liga"
(function(){
  const btn   = document.getElementById('btnStats');
  const dlg   = document.getElementById('statsModal');
  const close = document.getElementById('closeStats');

  if (btn && dlg && typeof dlg.showModal === 'function') {
    btn.addEventListener('click', ()=>{
      setActiveTab('overview');
      renderStats('overview');
      dlg.showModal();
    });
  }
  if (close && dlg && typeof dlg.close === 'function') {
    close.addEventListener('click', ()=> dlg.close());
  }

  const tabs = dlg ? dlg.querySelectorAll('.tab-btn') : [];
  tabs.forEach(t => t.addEventListener('click', ()=>{
    const tab = t.dataset.tab;
    setActiveTab(tab);
    renderStats(tab);
  }));
})();

function setActiveTab(tab){
  const dlg = document.getElementById('statsModal');
  if (!dlg) return;
  dlg.querySelectorAll('.tab-btn').forEach(b=> b.classList.remove('active'));
  const target = dlg.querySelector(`.tab-btn[data-tab="${tab}"]`);
  if (target) target.classList.add('active');
}



"]`);
  if (target) target.classList.add('active');
}

// Reto del día
$('#closeDaily').addEventListener('click', ()=> $("#dailyModal").close());

// Álbum
ui.btnAlbum?.addEventListener('click', ()=>{
  ui.albumSearch.value = '';
  renderAlbumRegionChips('all');
  renderAlbum('all');
  ui.albumModal.showModal();
});
ui.closeAlbum?.addEventListener('click', ()=> ui.albumModal.close());
ui.albumSearch?.addEventListener('input', ()=> renderAlbum(albumActiveRegion));

// Logros (botón header) — compat vitrina nueva / modal antiguo
ui.btnAchievements?.addEventListener('click', ()=>{
  if (ui.achievementsModal?.showModal){
    renderAchievements();
    ui.achievementsModal.showModal();
  }
});
ui.closeAchievements?.addEventListener('click', ()=>{
  ui.achievementsModal?.close?.();
});
  const achModal   = document.getElementById('achModal');
  const achSection = document.getElementById('achievementsSection');
  if (achModal && typeof achModal.showModal === 'function') {
    renderAchievementsModal();
    achModal.showModal();
  } else if (achSection) {
    achSection.classList.remove('hidden');
    if (typeof renderAchievements === 'function') renderAchievements();
    const top = achSection.getBoundingClientRect().top + window.scrollY - 16;
    window.scrollTo({ top, behavior:'smooth' });
  };
$('#closeAch')?.addEventListener('click', ()=> ui.achModal?.close?.());

// Respuestas
$$("#card-flag .answer-btn").forEach(b=> b.addEventListener('click', onSelect));
$$("#card-capital .answer-btn.cap").forEach(b=> b.addEventListener('click', onSelect));

/* ========= Carga inicial ========= */
async function ensureDataLoaded(){ if(!ALL.length) await loadData(); }

window.addEventListener('DOMContentLoaded', async ()=>{
  playerName = lsGet(LS.name, "") || "";
  if(playerName) $("#playerName").value = playerName;
  try{ await ensureDataLoaded(); }catch{}
  const last = lsGet(LS.last, null);
  if(last){
    currentMode = last.mode || null;
    currentLevel = last.level || 'adult';
    currentTheme = last.theme || 'all';
    if(currentMode){ ui.selMode.textContent = modeLabel(currentMode); }
    if(currentLevel){ ui.selLevel.textContent = LEVELS[currentLevel]?.label || '—'; }
    if(currentTheme){ ui.selTheme.textContent = currentTheme==='all'?'Mundo':currentTheme; }
  }
  updateDailyTile();
});

/* ========= Panel dev (opcional, tolerante) ========= */
(function initDevPanel(){
  function setup(){
    const devPanel = document.getElementById('devControl');
    const btnDevToggle = document.getElementById('btnDevToggle');
    const btnCloseControl = document.getElementById('btnCloseControl');
    if (!devPanel || !btnDevToggle) return;

    const checkboxes = devPanel.querySelectorAll('input[type="checkbox"]');
    const savedProgress = JSON.parse(localStorage.getItem('devProgress') || '{}');

    checkboxes.forEach(chk => { chk.checked = !!savedProgress[chk.id]; });
    btnDevToggle.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      devPanel.classList.toggle('hidden');
    });
    btnCloseControl?.addEventListener('click', (e) => { e.preventDefault(); devPanel.classList.add('hidden'); });
    checkboxes.forEach(chk => {
      chk.addEventListener('change', () => {
        savedProgress[chk.id] = chk.checked;
        localStorage.setItem('devProgress', JSON.stringify(savedProgress));
      });
    });
    document.addEventListener('click', (ev) => {
      if (!devPanel.classList.contains('hidden')) {
        const inside = devPanel.contains(ev.target) || btnDevToggle.contains(ev.target);
        if (!inside) devPanel.classList.add('hidden');
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, { once:true });
  else setup();
})();
/* ===== FAILSAFE: botón Estadísticas siempre abre su modal ===== */
(function(){
  try {
    const btn = document.getElementById('btnStats');
    const dlg = document.getElementById('statsModal');
    if (btn && dlg && typeof dlg.showModal === 'function') {
      btn.addEventListener('click', () => {
        // Pestaña por defecto
        const firstTab = dlg.querySelector('.tab-btn[data-tab="overview"]');
        if (firstTab) firstTab.classList.add('active');
        if (typeof renderStats === 'function') renderStats('overview');
        dlg.showModal();
      });
    }
    const close = document.getElementById('closeStats');
    if (close && dlg && typeof dlg.close === 'function') {
      close.addEventListener('click', () => dlg.close());
    }
  } catch(e) {
    console.warn('failsafe stats:', e);
  }
})();


