import {
  ArrowDown,
  ArrowUp,
  Camera,
  Check,
  Headphones,
  Keyboard,
  Music2,
  Radio,
  SlidersHorizontal,
  Volume2,
  VolumeX,
} from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GuitarEngine,
  transposeChordLabel,
  type ChordName,
  type StrumDirection,
} from "@/lib/guitar";

const CameraChordWheel = lazy(() => import("@/components/CameraChordWheel"));

type Mode = "essential" | "jannabi";
type ChordKey = {
  key: string;
  chord: ChordName;
  hint?: string;
};

const ESSENTIAL_CHORDS: ChordKey[] = [
  { key: "a", chord: "C", hint: "Major" },
  { key: "s", chord: "D", hint: "Major" },
  { key: "d", chord: "E", hint: "Major" },
  { key: "f", chord: "F", hint: "Major" },
  { key: "g", chord: "G", hint: "Major" },
  { key: "h", chord: "A", hint: "Major" },
  { key: "j", chord: "B", hint: "Major" },
  { key: "z", chord: "Am", hint: "Minor" },
  { key: "x", chord: "Em", hint: "Minor" },
  { key: "c", chord: "Dm", hint: "Minor" },
  { key: "v", chord: "Bm", hint: "Minor" },
  { key: "b", chord: "A7", hint: "7th" },
  { key: "n", chord: "B7", hint: "7th" },
  { key: "m", chord: "D7", hint: "7th" },
  { key: ",", chord: "E7", hint: "7th" },
];

const JANNABI_CHORDS: ChordKey[] = [
  { key: "a", chord: "G", hint: "I" },
  { key: "s", chord: "Bm", hint: "iii" },
  { key: "d", chord: "C", hint: "IV" },
  { key: "f", chord: "Cm", hint: "iv" },
  { key: "g", chord: "E", hint: "VI" },
  { key: "h", chord: "Am", hint: "ii" },
  { key: "j", chord: "D", hint: "V" },
  { key: "k", chord: "B7", hint: "V/vi" },
  { key: "l", chord: "Em", hint: "vi" },
  { key: ";", chord: "F", hint: "♭VII" },
  { key: "'", chord: "F#7", hint: "alt." },
];

const PROGRESSION = ["G", "B7", "Em", "G", "C", "Cm", "G"] as const;

const DISPLAY_KEY: Record<string, string> = {
  ",": ",",
  ";": ";",
  "'": "'",
};

function keyLabel(key: string) {
  return DISPLAY_KEY[key] ?? key.toUpperCase();
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 720px)");
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return mobile;
}

export default function Home() {
  const [engine] = useState(() => new GuitarEngine());
  const feedbackTimer = useRef<number | null>(null);
  const [experience, setExperience] = useState<"keyboard" | "camera">(() =>
    new URLSearchParams(window.location.search).get("mode") === "camera" ? "camera" : "keyboard",
  );
  const [mode, setMode] = useState<Mode>("essential");
  const [capoEnabled, setCapoEnabled] = useState(true);
  const [direction, setDirection] = useState<StrumDirection>("down");
  const [currentChord, setCurrentChord] = useState<ChordName>("G");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [history, setHistory] = useState<ChordName[]>(["G", "C", "Em"]);
  const [volume, setVolume] = useState(72);
  const [brightness, setBrightness] = useState(58);
  const [audioReady, setAudioReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const activeChords = mode === "essential" ? ESSENTIAL_CHORDS : JANNABI_CHORDS;
  const capo = mode === "jannabi" && capoEnabled ? 3 : 0;
  const keyMap = useMemo(
    () => new Map(activeChords.map((item) => [item.key, item.chord])),
    [activeChords],
  );

  useEffect(() => {
    engine.setVolume(volume / 100);
  }, [engine, volume]);

  useEffect(() => {
    engine.setBrightness(brightness / 100);
  }, [brightness, engine]);

  const flashKey = useCallback((key: string) => {
    setActiveKey(key);
    if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
    feedbackTimer.current = window.setTimeout(() => setActiveKey(null), 150);
  }, []);

  const play = useCallback(
    async (chord: ChordName, key: string, requestedDirection?: StrumDirection) => {
      try {
        const actualDirection = requestedDirection ?? direction;
        flashKey(key);
        setCurrentChord(chord);
        setDirection(actualDirection);
        setHistory((previous) => [...previous.slice(-4), chord]);
        await engine.playChord(chord, actualDirection, capo);
        setAudioReady(true);
        setError(null);
      } catch {
        setError("このブラウザでは音を開始できませんでした。Chrome / Safariでお試しください。");
      }
    },
    [capo, direction, engine, flashKey],
  );

  const mute = useCallback(async () => {
    await engine.mute();
    flashKey("space");
  }, [engine, flashKey]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;

      if (event.key === " ") {
        event.preventDefault();
        void mute();
        return;
      }
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        setDirection(event.key === "ArrowUp" ? "up" : "down");
        return;
      }

      const normalized = event.key.toLowerCase();
      const chord = keyMap.get(normalized);
      if (!chord) return;
      event.preventDefault();
      void play(chord, normalized, event.shiftKey ? "up" : direction);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [direction, keyMap, mute, play]);

  useEffect(
    () => () => {
      if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
    },
    [],
  );

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setCurrentChord(nextMode === "jannabi" ? "G" : "C");
    setHistory(nextMode === "jannabi" ? ["G", "Bm", "C"] : ["C", "G", "Am"]);
  };

  const soundingChord = transposeChordLabel(currentChord, capo);

  const openExperience = (next: "keyboard" | "camera") => {
    const url = next === "camera" ? `${window.location.pathname}?mode=camera` : window.location.pathname;
    window.history.replaceState(null, "", url);
    setExperience(next);
  };

  if (experience === "camera") {
    return (
      <Suspense fallback={<div className="camera-loading-shell">LOADING CAMERA INSTRUMENT</div>}>
        <CameraChordWheel engine={engine} onBack={() => openExperience("keyboard")} />
      </Suspense>
    );
  }

  return (
    <main className="app-shell">
      <div className="ambient-image" aria-hidden="true" />
      <div className="ambient-grid" aria-hidden="true" />

      <header className="topbar">
        <a className="brand" href="#instrument" aria-label="Strumkey ホーム">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>STRUMKEY</span>
        </a>
        <div className="topbar-meta">
          <span className={`signal ${audioReady ? "is-live" : ""}`}>
            <span className="signal-dot" />
            {audioReady ? "AUDIO LIVE" : "READY"}
          </span>
          <span className="topbar-divider" />
          <span>WEB AUDIO INSTRUMENT · 01</span>
          <button type="button" className="camera-mode-button" onClick={() => openExperience("camera")}>
            <Camera size={13} />
            CAMERA WHEEL
            <b>NEW</b>
          </button>
        </div>
      </header>

      <section id="instrument" className="instrument-stage" aria-label="ギターコード演奏エリア">
        <div className="intro-copy">
          <div className="eyebrow">
            <Radio size={13} strokeWidth={1.8} />
            BROWSER GUITAR
          </div>
          <h1>
            Press a key.
            <span>Feel the strings.</span>
          </h1>
          <p>
            パソコンのキーを押すだけ。リアルな6弦ストラムで、
            <br className="desktop-break" />
            アイデアをすぐ音にしよう。
          </p>

          <div className="quick-guide" aria-label="操作ガイド">
            <span>
              <kbd>SHIFT</kbd> アップストローク
            </span>
            <span>
              <kbd>SPACE</kbd> ミュート
            </span>
            <span>
              <kbd>↑↓</kbd> 方向
            </span>
          </div>
        </div>

        <div className="chord-display" aria-live="polite">
          <div className="display-topline">
            <span>NOW PLAYING</span>
            <span className="display-mode">{mode === "jannabi" ? "JANNABI SET" : "ESSENTIAL SET"}</span>
          </div>
          <div className={`chord-letter ${activeKey ? "is-struck" : ""}`}>{currentChord}</div>
          <div className="sounding-note">
            {capo > 0 ? (
              <>
                <span>CAPO 3</span>
                Sounds as <strong>{soundingChord}</strong>
              </>
            ) : (
              <>
                <span>OPEN</span>
                Standard tuning
              </>
            )}
          </div>
          <div className={`string-bank ${activeKey ? "is-vibrating" : ""}`} aria-hidden="true">
            {Array.from({ length: 6 }).map((_, index) => (
              <i key={index} />
            ))}
          </div>
          <div className="history-row">
            <span>RECENT</span>
            <div>
              {history.map((chord, index) => (
                <span key={`${chord}-${index}`} className={index === history.length - 1 ? "current" : ""}>
                  {chord}
                </span>
              ))}
            </div>
          </div>
        </div>

        <aside className="controls-panel" aria-label="演奏設定">
          <div className="panel-heading">
            <span>PLAYBACK</span>
            <SlidersHorizontal size={14} />
          </div>

          <div className="direction-control">
            <span className="control-label">STRUM</span>
            <div className="segmented-control">
              <button
                type="button"
                className={direction === "down" ? "active" : ""}
                onClick={() => setDirection("down")}
                aria-pressed={direction === "down"}
              >
                <ArrowDown size={15} /> DOWN
              </button>
              <button
                type="button"
                className={direction === "up" ? "active" : ""}
                onClick={() => setDirection("up")}
                aria-pressed={direction === "up"}
              >
                <ArrowUp size={15} /> UP
              </button>
            </div>
          </div>

          <label className="range-control">
            <span className="control-label">
              <span>{volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />} VOLUME</span>
              <b>{volume}</b>
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              style={{ "--range-progress": `${volume}%` } as React.CSSProperties}
            />
          </label>

          <label className="range-control">
            <span className="control-label">
              <span><Music2 size={14} /> TONE</span>
              <b>{brightness < 40 ? "WARM" : brightness > 72 ? "BRIGHT" : "NATURAL"}</b>
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={brightness}
              onChange={(event) => setBrightness(Number(event.target.value))}
              style={{ "--range-progress": `${brightness}%` } as React.CSSProperties}
            />
          </label>

          <button className="mute-button" type="button" onClick={() => void mute()}>
            <VolumeX size={15} />
            STOP / MUTE
            <kbd>SPACE</kbd>
          </button>
        </aside>
      </section>

      <section className="keyboard-dock" aria-label="コードキーボード">
        <div className="dock-header">
          <div className="mode-tabs" role="tablist" aria-label="コードセット">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "essential"}
              className={mode === "essential" ? "active" : ""}
              onClick={() => switchMode("essential")}
            >
              <Keyboard size={15} />
              MAIN CHORDS
              <span>15</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "jannabi"}
              className={mode === "jannabi" ? "active" : ""}
              onClick={() => switchMode("jannabi")}
            >
              <Headphones size={15} />
              FOR LOVERS WHO HESITATE
              <span>11</span>
            </button>
          </div>

          {mode === "jannabi" && (
            <button
              type="button"
              className={`capo-toggle ${capoEnabled ? "active" : ""}`}
              onClick={() => setCapoEnabled((value) => !value)}
              aria-pressed={capoEnabled}
            >
              <span className="toggle-track"><i /></span>
              CAPO 3
              {capoEnabled && <Check size={13} />}
            </button>
          )}
        </div>

        {mode === "jannabi" && (
          <div className="song-context">
            <div>
              <span className="song-kicker">JANNABI · LEGEND · 2019</span>
              <strong>주저하는 연인들을 위해</strong>
              <small>For lovers who hesitate</small>
            </div>
            <div className="progression" aria-label="サビ練習進行">
              <span>CHORUS LOOP</span>
              {PROGRESSION.map((chord, index) => (
                <button
                  type="button"
                  key={`${chord}-${index}`}
                  onClick={() => {
                    const item = JANNABI_CHORDS.find((entry) => entry.chord === chord);
                    if (item) void play(item.chord, item.key);
                  }}
                >
                  {chord}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={`chord-grid ${mode === "jannabi" ? "jannabi-grid" : ""}`}>
          {activeChords.map((item) => {
            const soundLabel = capo > 0 ? transposeChordLabel(item.chord, capo) : null;
            return (
              <button
                className={`chord-key ${activeKey === item.key ? "active" : ""}`}
                type="button"
                key={`${mode}-${item.key}-${item.chord}`}
                onClick={() => void play(item.chord, item.key)}
                aria-label={`${keyLabel(item.key)}キーで${item.chord}コードを演奏`}
              >
                <span className="physical-key">{keyLabel(item.key)}</span>
                <span className="key-chord">{item.chord}</span>
                <span className="key-meta">
                  {soundLabel ? `${soundLabel} sound` : item.hint}
                </span>
                <span className="key-shine" aria-hidden="true" />
              </button>
            );
          })}
        </div>

        <div className="dock-footer">
          <span>
            <span className="footer-dot" />
            {isMobile ? "コードをタップして演奏" : "英字入力をOFFにして、キーを押して演奏"}
          </span>
          <span>STANDARD TUNING · E A D G B E</span>
          <span>HEADPHONES RECOMMENDED</span>
        </div>
      </section>

      {error && <div className="error-toast" role="alert">{error}</div>}
    </main>
  );
}
