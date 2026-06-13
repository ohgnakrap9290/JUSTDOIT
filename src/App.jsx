import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  Flame,
  Focus,
  Leaf,
  Moon,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  Sparkles,
  Sun,
  TimerReset,
  Trash2,
  X,
} from "lucide-react";

const STORAGE_KEY = "harugyeol-data-v1";
const MOODS = [
  { value: 1, emoji: "😮‍💨", label: "버거워요" },
  { value: 2, emoji: "🌧️", label: "조금 흐려요" },
  { value: 3, emoji: "🌿", label: "그럭저럭" },
  { value: 4, emoji: "☀️", label: "좋아요" },
  { value: 5, emoji: "✨", label: "아주 좋아요" },
];
const RESET_ACTIONS = [
  { title: "창밖을 60초 바라보기", detail: "먼 곳을 보며 눈과 생각의 초점을 함께 풀어주세요.", time: "1분" },
  { title: "물 한 잔 천천히 마시기", detail: "화면을 내려놓고 몸이 깨어나는 감각에 집중해보세요.", time: "2분" },
  { title: "책상 위 한 곳만 비우기", detail: "완벽한 정리 대신 손바닥 두 개만큼의 여백을 만드세요.", time: "3분" },
  { title: "어깨와 목 길게 늘이기", detail: "숨을 내쉴 때마다 어깨의 힘을 조금씩 빼주세요.", time: "2분" },
  { title: "고마운 사람 한 명 떠올리기", detail: "짧은 메시지를 보내도 좋고, 마음으로만 생각해도 좋아요.", time: "2분" },
  { title: "오늘 안 해도 될 일 지우기", detail: "해야 할 일보다 하지 않아도 될 일을 정하는 연습이에요.", time: "3분" },
  { title: "좋아하는 노래 한 곡 듣기", detail: "다른 일은 잠시 멈추고 처음부터 끝까지 들어보세요.", time: "4분" },
];

const emptyDay = () => ({
  mood: null,
  energy: 3,
  focus: "",
  tasks: [],
  resetDone: false,
  reflection: "",
  focusMinutes: 0,
  visited: true,
});

function localDateKey(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function loadData() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      settings: { name: "", theme: "light", onboarded: false, ...parsed?.settings },
      days: parsed?.days || {},
    };
  } catch {
    return { settings: { name: "", theme: "light", onboarded: false }, days: {} };
  }
}

function dayOfYear(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
}

function completion(day) {
  if (!day) return 0;
  const checks = [Boolean(day.mood), Boolean(day.focus.trim()), day.resetDone, Boolean(day.reflection.trim())];
  return checks.filter(Boolean).length * 25;
}

function calculateStreak(days) {
  let streak = 0;
  const cursor = new Date();
  if (!days[localDateKey(cursor)]?.mood) cursor.setDate(cursor.getDate() - 1);
  while (days[localDateKey(cursor)]?.mood) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function App() {
  const [data, setData] = useState(loadData);
  const [showSettings, setShowSettings] = useState(false);
  const [showWelcome, setShowWelcome] = useState(() => !loadData().settings.onboarded);
  const today = localDateKey();
  const current = data.days[today] || emptyDay();
  const streak = calculateStreak(data.days);
  const progress = completion(current);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    document.documentElement.dataset.theme = data.settings.theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content",
      data.settings.theme === "dark" ? "#15201e" : "#f3efe8",
    );
  }, [data.settings.theme]);

  const updateDay = (patch) => {
    setData((prev) => ({
      ...prev,
      days: { ...prev.days, [today]: { ...emptyDay(), ...prev.days[today], ...patch } },
    }));
  };

  const updateSettings = (patch) => {
    setData((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  };

  const finishWelcome = (name) => {
    updateSettings({ name: name.trim(), onboarded: true });
    setShowWelcome(false);
  };

  return (
    <div className="app-shell">
      <Header
        streak={streak}
        theme={data.settings.theme}
        onTheme={() => updateSettings({ theme: data.settings.theme === "light" ? "dark" : "light" })}
        onSettings={() => setShowSettings(true)}
      />

      <main>
        <Hero name={data.settings.name} progress={progress} />

        <section className="dashboard" aria-label="오늘의 대시보드">
          <div className="dashboard-main">
            <MoodCard day={current} onChange={updateDay} />
            <FocusCard day={current} onChange={updateDay} />
            <ResetCard done={current.resetDone} onChange={(resetDone) => updateDay({ resetDone })} />
            <ReflectionCard value={current.reflection} onChange={(reflection) => updateDay({ reflection })} />
          </div>

          <aside className="dashboard-side">
            <FocusTimer onComplete={() => updateDay({ focusMinutes: current.focusMinutes + 25 })} />
            <WeeklyCard days={data.days} />
            <QuoteCard />
          </aside>
        </section>
      </main>

      <Footer />

      {showWelcome && <WelcomeModal onFinish={finishWelcome} />}
      {showSettings && (
        <SettingsModal
          settings={data.settings}
          onChange={updateSettings}
          onClose={() => setShowSettings(false)}
          onReset={() => {
            localStorage.removeItem(STORAGE_KEY);
            setData({ settings: { name: "", theme: "light", onboarded: false }, days: {} });
            setShowSettings(false);
            setShowWelcome(true);
          }}
        />
      )}
    </div>
  );
}

function Header({ streak, theme, onTheme, onSettings }) {
  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="하루결 홈">
        <span className="brand-mark"><Leaf size={19} strokeWidth={2.3} /></span>
        <span>하루결</span>
      </a>
      <nav className="header-actions" aria-label="사용자 메뉴">
        <div className="streak-chip" title="연속 체크인">
          <Flame size={16} />
          <strong>{streak}</strong>
          <span>일째</span>
        </div>
        <button className="icon-button" onClick={onTheme} aria-label={theme === "light" ? "다크 모드" : "라이트 모드"}>
          {theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
        </button>
        <button className="icon-button" onClick={onSettings} aria-label="설정 열기">
          <Settings2 size={19} />
        </button>
      </nav>
    </header>
  );
}

function Hero({ name, progress }) {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 6 ? "고요한 밤이에요" : hour < 12 ? "좋은 아침이에요" : hour < 18 ? "오늘도 잘 가고 있어요" : "수고한 하루예요";
  const date = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "long" }).format(now);

  return (
    <section className="hero" id="top">
      <img src="/assets/daily-reset-dawn.webp" alt="" className="hero-image" />
      <div className="hero-scrim" />
      <div className="hero-content">
        <div>
          <p className="eyebrow"><Sparkles size={14} /> {date}</p>
          <h1>{name ? `${name}님, ` : ""}{greeting}<br /><span>오늘의 결</span>을 정돈해볼까요?</h1>
          <p className="hero-copy">완벽한 하루보다, 나에게 맞는 속도로 가는 하루.</p>
        </div>
        <div className="progress-card" aria-label={`오늘 기록 ${progress}% 완료`}>
          <div className="progress-ring" style={{ "--progress": `${progress * 3.6}deg` }}>
            <div><strong>{progress}</strong><span>%</span></div>
          </div>
          <div>
            <span className="progress-label">오늘의 리듬</span>
            <strong>{progress === 100 ? "충분히 채웠어요" : progress >= 50 ? "좋은 흐름이에요" : "천천히 시작해요"}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

function CardTitle({ icon: Icon, kicker, title, action }) {
  return (
    <div className="card-title">
      <div className="title-icon"><Icon size={19} /></div>
      <div>
        <span>{kicker}</span>
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

function MoodCard({ day, onChange }) {
  return (
    <article className="card mood-card">
      <CardTitle icon={Sun} kicker="CHECK-IN" title="지금 마음은 어떤가요?" />
      <div className="mood-list" role="radiogroup" aria-label="오늘의 기분">
        {MOODS.map((mood) => (
          <button
            key={mood.value}
            className={day.mood === mood.value ? "mood active" : "mood"}
            onClick={() => onChange({ mood: mood.value })}
            role="radio"
            aria-checked={day.mood === mood.value}
          >
            <span>{mood.emoji}</span>
            <small>{mood.label}</small>
          </button>
        ))}
      </div>
      <div className="energy-row">
        <label htmlFor="energy">오늘의 에너지</label>
        <input
          id="energy"
          type="range"
          min="1"
          max="5"
          value={day.energy}
          onChange={(event) => onChange({ energy: Number(event.target.value) })}
          style={{ "--range": `${(day.energy - 1) * 25}%` }}
        />
        <strong>{day.energy}/5</strong>
      </div>
    </article>
  );
}

function FocusCard({ day, onChange }) {
  const [draft, setDraft] = useState("");
  const addTask = () => {
    const text = draft.trim();
    if (!text || day.tasks.length >= 3) return;
    onChange({ tasks: [...day.tasks, { id: crypto.randomUUID(), text, done: false }] });
    setDraft("");
  };

  return (
    <article className="card focus-card">
      <CardTitle
        icon={Focus}
        kicker="ONE THING"
        title="오늘, 이것만은"
        action={<span className="limit-note">가장 중요한 한 가지</span>}
      />
      <input
        className="focus-input"
        value={day.focus}
        onChange={(event) => onChange({ focus: event.target.value })}
        placeholder="오늘을 만족스럽게 만들 한 가지는?"
        maxLength={80}
        aria-label="오늘 가장 중요한 일"
      />
      <div className="task-list">
        {day.tasks.map((task) => (
          <div className={task.done ? "task done" : "task"} key={task.id}>
            <button
              className="task-check"
              onClick={() => onChange({ tasks: day.tasks.map((item) => item.id === task.id ? { ...item, done: !item.done } : item) })}
              aria-label={task.done ? `${task.text} 완료 취소` : `${task.text} 완료`}
            >
              {task.done && <Check size={14} />}
            </button>
            <span>{task.text}</span>
            <button
              className="task-delete"
              onClick={() => onChange({ tasks: day.tasks.filter((item) => item.id !== task.id) })}
              aria-label={`${task.text} 삭제`}
            >
              <X size={15} />
            </button>
          </div>
        ))}
        {day.tasks.length < 3 && (
          <div className="task-add">
            <Plus size={16} />
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && addTask()}
              placeholder="작은 단계 추가"
              maxLength={50}
              aria-label="작은 단계 추가"
            />
            {draft && <button onClick={addTask}>추가</button>}
          </div>
        )}
      </div>
    </article>
  );
}

function ResetCard({ done, onChange }) {
  const action = RESET_ACTIONS[dayOfYear() % RESET_ACTIONS.length];
  return (
    <article className={done ? "card reset-card completed" : "card reset-card"}>
      <CardTitle icon={Leaf} kicker="TINY RESET" title="오늘의 작은 리셋" />
      <div className="reset-content">
        <div className="reset-visual"><span>숨</span><i /></div>
        <div>
          <span className="time-pill"><TimerReset size={13} /> {action.time}</span>
          <h3>{action.title}</h3>
          <p>{action.detail}</p>
          <button className="primary-button" onClick={() => onChange(!done)}>
            {done ? <><CheckCircle2 size={17} /> 완료했어요</> : <>지금 해볼게요 <ArrowRight size={17} /></>}
          </button>
        </div>
      </div>
    </article>
  );
}

function ReflectionCard({ value, onChange }) {
  return (
    <article className="card reflection-card">
      <CardTitle icon={Sparkles} kicker="ONE LINE" title="오늘의 한 줄" />
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={180}
        placeholder="오늘 기억하고 싶은 순간이나, 지금 나에게 해주고 싶은 말을 적어보세요."
        aria-label="오늘의 한 줄 기록"
      />
      <div className="textarea-meta">
        <span>입력하는 즉시 안전하게 저장돼요</span>
        <span>{value.length}/180</span>
      </div>
    </article>
  );
}

function FocusTimer({ onComplete }) {
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState("focus");
  const total = mode === "focus" ? 25 * 60 : 5 * 60;

  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          setRunning(false);
          if (mode === "focus") onComplete();
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, mode, onComplete]);

  const switchMode = (next) => {
    setMode(next);
    setRunning(false);
    setSeconds(next === "focus" ? 25 * 60 : 5 * 60);
  };
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");

  return (
    <article className="card timer-card">
      <CardTitle icon={TimerReset} kicker="DEEP FOCUS" title="집중 타이머" />
      <div className="timer-tabs">
        <button className={mode === "focus" ? "active" : ""} onClick={() => switchMode("focus")}>집중 25분</button>
        <button className={mode === "break" ? "active" : ""} onClick={() => switchMode("break")}>쉼 5분</button>
      </div>
      <div className="timer-dial" style={{ "--timer": `${(1 - seconds / total) * 360}deg` }}>
        <div>
          <span>{mode === "focus" ? "집중하는 시간" : "잠시 쉬어가요"}</span>
          <strong>{minutes}:{secs}</strong>
        </div>
      </div>
      <div className="timer-actions">
        <button className="timer-reset" onClick={() => { setRunning(false); setSeconds(total); }} aria-label="타이머 초기화">
          <RotateCcw size={18} />
        </button>
        <button className="timer-play" onClick={() => setRunning(!running)}>
          {running ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          {running ? "잠시 멈춤" : seconds === 0 ? "다시 시작" : "시작하기"}
        </button>
      </div>
    </article>
  );
}

function WeeklyCard({ days }) {
  const week = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = localDateKey(date);
      return {
        key,
        label: new Intl.DateTimeFormat("ko-KR", { weekday: "short" }).format(date).replace("요일", ""),
        day: days[key],
        today: index === 6,
      };
    });
  }, [days]);
  const checked = week.filter((item) => item.day?.mood).length;

  return (
    <article className="card weekly-card">
      <CardTitle
        icon={BarChart3}
        kicker="WEEKLY FLOW"
        title="이번 주의 나"
        action={<button className="text-button" aria-label="주간 기록 보기">기록 <ChevronRight size={15} /></button>}
      />
      <div className="week-chart" aria-label={`최근 7일 중 ${checked}일 체크인`}>
        {week.map((item) => {
          const value = item.day?.mood || 0;
          return (
            <div className="week-bar-wrap" key={item.key}>
              <div className="bar-track">
                <div className={value ? "bar filled" : "bar"} style={{ height: value ? `${25 + value * 13}%` : "9%" }}>
                  {value > 0 && <span>{MOODS[value - 1].emoji}</span>}
                </div>
              </div>
              <small className={item.today ? "today" : ""}>{item.label}</small>
            </div>
          );
        })}
      </div>
      <div className="week-summary">
        <strong>{checked}일</strong>
        <span>이번 주에 나를 살펴봤어요</span>
      </div>
    </article>
  );
}

function QuoteCard() {
  const weekday = new Intl.DateTimeFormat("ko-KR", { weekday: "long" }).format(new Date());
  return (
    <article className="quote-card">
      <span>오늘의 문장</span>
      <blockquote>“속도보다 중요한 건<br />내가 향하는 방향이다.”</blockquote>
      <p>천천히 가도 괜찮은 {weekday}</p>
    </article>
  );
}

function WelcomeModal({ onFinish }) {
  const [name, setName] = useState("");
  return (
    <div className="modal-backdrop">
      <div className="modal welcome-modal" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
        <div className="welcome-art">
          <Leaf size={29} />
          <span />
          <span />
          <span />
        </div>
        <p className="eyebrow">WELCOME TO HARUGYEOL</p>
        <h2 id="welcome-title">매일 5분,<br />나를 위한 여백을 만들어요.</h2>
        <p>하루결은 할 일을 더 쌓는 곳이 아니라<br />오늘의 나에게 중요한 것을 발견하는 공간이에요.</p>
        <label>
          어떻게 불러드릴까요?
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && onFinish(name)}
            placeholder="이름 또는 별명 (선택)"
            maxLength={20}
          />
        </label>
        <button className="primary-button wide" onClick={() => onFinish(name)}>
          나의 하루 시작하기 <ArrowRight size={18} />
        </button>
        <small>회원가입 없이 이 기기에만 안전하게 저장됩니다.</small>
      </div>
    </div>
  );
}

function SettingsModal({ settings, onChange, onClose, onReset }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="modal-header">
          <div>
            <span>MY SPACE</span>
            <h2 id="settings-title">설정</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="설정 닫기"><X size={20} /></button>
        </div>
        <label>
          나를 부를 이름
          <input value={settings.name} onChange={(event) => onChange({ name: event.target.value })} maxLength={20} />
        </label>
        <div className="setting-row">
          <div><strong>화면 테마</strong><span>눈이 편한 화면을 선택하세요.</span></div>
          <div className="theme-switch">
            <button className={settings.theme === "light" ? "active" : ""} onClick={() => onChange({ theme: "light" })}><Sun size={16} /> 밝게</button>
            <button className={settings.theme === "dark" ? "active" : ""} onClick={() => onChange({ theme: "dark" })}><Moon size={16} /> 어둡게</button>
          </div>
        </div>
        <div className="data-note"><Leaf size={18} /><p><strong>당신의 기록은 당신의 것</strong><br />모든 데이터는 서버가 아닌 현재 브라우저에 저장됩니다.</p></div>
        <button className="danger-button" onClick={onReset}><Trash2 size={16} /> 모든 기록 초기화</button>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer>
      <a className="brand" href="#top"><span className="brand-mark"><Leaf size={17} /></span><span>하루결</span></a>
      <p>오늘도 나다운 결로, 충분히.</p>
      <span>© 2026 HARUGYEOL</span>
    </footer>
  );
}

export default App;
