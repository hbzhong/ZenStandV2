
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Play, Pause, RotateCcw, Settings, Wind, Award, 
  CheckCircle2, Volume2, VolumeX, BookOpen, Calendar, 
  Download, Share2 
} from 'lucide-react';

// --- TYPES ---
interface SessionHistory {
  id: string;
  duration: number;
  date: string;
}

interface ZenQuote {
  quote: string;
  author: string;
  advice: string;
}

interface CompletionBlessing {
  title: string;
  message: string;
}

enum TimerStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED'
}

// --- SERVICES ---
const getApiKey = () => {
  try { return (window as any).process?.env?.API_KEY || ""; } catch (e) { return ""; }
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

const fetchZenWisdom = async (): Promise<ZenQuote> => {
  try {
    const key = getApiKey();
    if (!key) throw new Error("No Key");
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Generate a short Zen quote in Chinese about Zhan Zhuang meditation and a tip.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            quote: { type: Type.STRING },
            author: { type: Type.STRING },
            advice: { type: Type.STRING }
          },
          required: ["quote", "author", "advice"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return { quote: "静心站立，感受天地的律动。", author: "古德", advice: "虚灵顶劲，沉肩坠肘。" };
  }
};

const fetchCompletionBlessing = async (mins: number): Promise<CompletionBlessing> => {
  try {
    const key = getApiKey();
    if (!key) throw new Error("No Key");
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `User finished ${mins} mins of Zhan Zhuang. Generate a blessing.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: { title: { type: Type.STRING }, message: { type: Type.STRING } },
          required: ["title", "message"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return { title: "功德圆满", message: "每一次静立都是对灵魂的洗涤。" };
  }
};

// --- COMPONENTS ---
const CircularTimer: React.FC<{ timeLeft: number; totalTime: number }> = ({ timeLeft, totalTime }) => {
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const progress = totalTime > 0 ? timeLeft / totalTime : 0;
  const strokeDashoffset = circumference * (1 - progress);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative flex items-center justify-center w-64 h-64 md:w-80 md:h-80">
      <svg className="w-full h-full transform -rotate-90">
        <circle className="text-stone-200" strokeWidth="8" stroke="currentColor" fill="transparent" r={radius} cx="50%" cy="50%" />
        <circle className="text-emerald-600 transition-all duration-1000 ease-linear" strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" stroke="currentColor" fill="transparent" r={radius} cx="50%" cy="50%" />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-5xl md:text-6xl font-light text-stone-800 font-serif-sc">{formatTime(timeLeft)}</span>
        <span className="text-sm text-stone-400 mt-2 tracking-widest uppercase">{timeLeft > 0 ? "保持静止" : "圆满"}</span>
      </div>
    </div>
  );
};

// --- APP ---
const App: React.FC = () => {
  const [status, setStatus] = useState<TimerStatus>(TimerStatus.IDLE);
  const [duration, setDuration] = useState(600);
  const [timeLeft, setTimeLeft] = useState(600);
  const [wisdom, setWisdom] = useState<ZenQuote | null>(null);
  const [history, setHistory] = useState<SessionHistory[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [blessing, setBlessing] = useState<CompletionBlessing | null>(null);
  const [isPunchInModalOpen, setIsPunchInModalOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  
  const timerRef = useRef<any>(null);

  useEffect(() => {
    fetchZenWisdom().then(setWisdom);
    const stored = localStorage.getItem('zhanzhuang_history_v2');
    if (stored) setHistory(JSON.parse(stored));
  }, []);

  const streak = useMemo(() => {
    if (history.length === 0) return 0;
    const dates = Array.from(new Set(history.map(h => h.date))).sort((a, b) => b.localeCompare(a));
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (dates[0] !== today && dates[0] !== yesterday) return 0;
    let count = 0;
    let current = dates[0] === today ? today : yesterday;
    for (const d of dates) {
      if (d === current) {
        count++;
        current = new Date(new Date(current).getTime() - 86400000).toISOString().split('T')[0];
      } else break;
    }
    return count;
  }, [history]);

  const weekActivity = useMemo(() => {
    const res = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      res.push({ label: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()], active: history.some(h => h.date === ds) });
    }
    return res;
  }, [history]);

  const handleStart = () => setStatus(TimerStatus.RUNNING);
  const handlePause = () => setStatus(TimerStatus.PAUSED);
  const handleReset = () => { setStatus(TimerStatus.IDLE); setTimeLeft(duration); };

  const saveHistory = useCallback(async (d: number) => {
    const today = new Date().toISOString().split('T')[0];
    const newHistory = [{ id: Date.now().toString(), duration: d, date: today }, ...history];
    setHistory(newHistory);
    localStorage.setItem('zhanzhuang_history_v2', JSON.stringify(newHistory));
    const bless = await fetchCompletionBlessing(Math.floor(d / 60));
    setBlessing(bless);
    setIsPunchInModalOpen(true);
  }, [history]);

  useEffect(() => {
    if (status === TimerStatus.RUNNING && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft(p => p - 1), 1000);
    } else if (timeLeft === 0 && status === TimerStatus.RUNNING) {
      setStatus(TimerStatus.COMPLETED);
      saveHistory(duration);
    }
    return () => clearInterval(timerRef.current);
  }, [status, timeLeft]);

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-800">
      <header className="px-6 py-4 flex justify-between items-center bg-white/50 backdrop-blur-md sticky top-0 z-30 border-b border-stone-100">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg"><Wind className="text-white" size={24} /></div>
          <div><h1 className="text-lg font-serif-sc font-bold">站桩禅院</h1><p className="text-[10px] text-stone-400 uppercase tracking-widest">Standalone Version</p></div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 flex items-center space-x-1">
            <Award size={14} className="text-emerald-600" /><span className="text-xs font-bold text-emerald-700">{streak} 天</span>
          </div>
          <button onClick={() => setShowSettings(!showSettings)} className="p-2 text-stone-500"><Settings size={20} /></button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {wisdom && (
          <div className="max-w-md text-center mb-8 px-4">
            <p className="text-xl font-serif-sc text-stone-700 italic">「{wisdom.quote}」</p>
            <p className="text-sm text-stone-400 mt-2">— {wisdom.author}</p>
          </div>
        )}
        
        <CircularTimer timeLeft={timeLeft} totalTime={duration} />

        <div className="mt-12 flex items-center space-x-8">
          <button onClick={handleReset} className="p-4 bg-white shadow-sm border rounded-2xl text-stone-400"><RotateCcw size={24} /></button>
          {status === TimerStatus.RUNNING ? (
            <button onClick={handlePause} className="w-20 h-20 bg-emerald-600 text-white rounded-3xl shadow-xl flex items-center justify-center"><Pause size={32} /></button>
          ) : (
            <button onClick={handleStart} disabled={timeLeft === 0} className="w-20 h-20 bg-emerald-600 text-white rounded-3xl shadow-xl flex items-center justify-center disabled:bg-stone-300"><Play size={32} fill="currentColor" className="ml-1" /></button>
          )}
          <button onClick={() => setIsAudioEnabled(!isAudioEnabled)} className={`p-4 bg-white shadow-sm border rounded-2xl ${isAudioEnabled ? 'text-emerald-600' : 'text-stone-400'}`}>{isAudioEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}</button>
        </div>

        {showSettings && (
          <div className="mt-8 max-w-sm w-full bg-white p-6 rounded-3xl shadow-2xl border border-stone-100">
            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-6">设定时长</h3>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-serif-sc font-bold text-emerald-700">{duration/60} <span className="text-sm font-normal text-stone-400">分钟</span></span>
              <input type="range" min="1" max="120" value={duration/60} onChange={(e) => {
                const v = parseInt(e.target.value) * 60;
                setDuration(v); if (status === TimerStatus.IDLE) setTimeLeft(v);
              }} className="w-2/3 accent-emerald-600" />
            </div>
          </div>
        )}
      </main>

      <footer className="w-full max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-3xl border shadow-sm">
            <div className="flex items-center space-x-3 mb-2"><BookOpen size={18} className="text-emerald-600" /><h4 className="font-bold">修行要领</h4></div>
            <p className="text-sm text-stone-500">{wisdom?.advice || "静心观照，呼吸自然。"}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border shadow-sm">
            <div className="flex items-center space-x-3 mb-2"><Calendar size={18} className="text-stone-600" /><h4 className="font-bold">最近记录</h4></div>
            <div className="text-xs space-y-1">{history.slice(0, 3).map(h => <div key={h.id} className="flex justify-between border-b pb-1"><span>{h.date}</span><span className="text-emerald-600 font-bold">{Math.floor(h.duration/60)} 分钟</span></div>)}</div>
          </div>
        </div>
      </footer>

      {isPunchInModalOpen && blessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white max-w-sm w-full rounded-[40px] shadow-2xl overflow-hidden text-center p-10">
            <CheckCircle2 size={48} className="mx-auto mb-4 text-emerald-600" />
            <h2 className="text-2xl font-serif-sc font-bold mb-4">{blessing.title}</h2>
            <p className="text-stone-600 italic mb-8">“{blessing.message}”</p>
            <button onClick={() => setIsPunchInModalOpen(false)} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold">确定</button>
          </div>
        </div>
      )}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
