
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TimerStatus, ZenQuote, SessionHistory, CompletionBlessing } from './types';
import { fetchZenWisdom, fetchCompletionBlessing } from './services/geminiService';
import CircularTimer from './components/CircularTimer';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Settings, 
  History as HistoryIcon, 
  BookOpen,
  Volume2,
  VolumeX,
  Wind,
  Calendar,
  Award,
  CheckCircle2,
  X,
  Share2,
  Download
} from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<TimerStatus>(TimerStatus.IDLE);
  const [duration, setDuration] = useState<number>(600); 
  const [timeLeft, setTimeLeft] = useState<number>(600);
  const [wisdom, setWisdom] = useState<ZenQuote | null>(null);
  const [history, setHistory] = useState<SessionHistory[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [blessing, setBlessing] = useState<CompletionBlessing | null>(null);
  const [isPunchInModalOpen, setIsPunchInModalOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const getWisdom = async () => {
      const data = await fetchZenWisdom();
      setWisdom(data);
    };
    getWisdom();
    
    const storedHistory = localStorage.getItem('zhanzhuang_history_v2');
    if (storedHistory) {
      setHistory(JSON.parse(storedHistory));
    }
  }, []);

  const streak = useMemo(() => {
    if (history.length === 0) return 0;
    const dates = Array.from(new Set(history.map(h => h.date))).sort((a, b) => b.localeCompare(a));
    let count = 0;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (dates[0] !== today && dates[0] !== yesterday) return 0;
    let current = dates[0] === today ? today : yesterday;
    for (let i = 0; i < dates.length; i++) {
      if (dates[i] === current) {
        count++;
        const prevDay = new Date(new Date(current).getTime() - 86400000).toISOString().split('T')[0];
        current = prevDay;
      } else { break; }
    }
    return count;
  }, [history]);

  const weekActivity = useMemo(() => {
    const today = new Date();
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const hasDone = history.some(h => h.date === dateStr);
      result.push({ label: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()], active: hasDone });
    }
    return result;
  }, [history]);

  const handleStart = () => setStatus(TimerStatus.RUNNING);
  const handlePause = () => setStatus(TimerStatus.PAUSED);
  const handleReset = () => {
    setStatus(TimerStatus.IDLE);
    setTimeLeft(duration);
  };

  const saveHistory = useCallback(async (totalDuration: number) => {
    const today = new Date().toISOString().split('T')[0];
    const newSession: SessionHistory = {
      id: Date.now().toString(),
      duration: totalDuration,
      date: today
    };
    const updatedHistory = [newSession, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('zhanzhuang_history_v2', JSON.stringify(updatedHistory));
    const bless = await fetchCompletionBlessing(Math.floor(totalDuration / 60));
    setBlessing(bless);
    setIsPunchInModalOpen(true);
  }, [history]);

  useEffect(() => {
    if (status === TimerStatus.RUNNING && timeLeft > 0) {
      timerRef.current = setInterval(() => { setTimeLeft(prev => prev - 1); }, 1000);
    } else if (timeLeft === 0 && status === TimerStatus.RUNNING) {
      setStatus(TimerStatus.COMPLETED);
      saveHistory(duration);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status, timeLeft, duration, saveHistory]);

  const handleShare = () => {
    if (!blessing) return;
    const text = `【站桩禅院修行记录】\n✨ ${blessing.title}\n🧘‍♂️ 本次修行：${Math.floor(duration / 60)} 分钟\n🔥 连续打卡：${streak} 天\n💬 「${blessing.message}」\n#站桩 #禅修 #每日打卡`;
    navigator.clipboard.writeText(text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const exportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "zhanzhuang_logs.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-800 font-sans selection:bg-emerald-100">
      <header className="px-6 py-6 flex justify-between items-center bg-white/50 backdrop-blur-md sticky top-0 z-30 border-b border-stone-100">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
            <Wind className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-lg font-serif-sc font-bold leading-none">站桩禅院</h1>
            <p className="text-[10px] text-stone-400 uppercase tracking-widest mt-1">GitHub Pages 版</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
            <Award size={14} className="text-emerald-600" />
            <span className="text-xs font-bold text-emerald-700">{streak} 天连修</span>
          </div>
          <button onClick={() => setShowSettings(!showSettings)} className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-500">
            <Settings size={20} />
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto w-full px-6 pt-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-widest">本周精进</h2>
            <div className="flex items-center space-x-2 mt-2">
              {weekActivity.map((day, i) => (
                <div key={i} className="flex flex-col items-center space-y-1">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all ${day.active ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100' : 'bg-stone-200 text-stone-400'}`}>
                    {day.active ? <CheckCircle2 size={14} /> : day.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button onClick={exportData} className="flex items-center space-x-1 text-xs text-stone-400 hover:text-emerald-600 transition-colors p-2 rounded-lg">
            <Download size={14} />
            <span>导出记录</span>
          </button>
        </div>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full mb-12 text-center px-4">
          {wisdom && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <p className="text-xl font-serif-sc text-stone-700 leading-relaxed italic italic">「{wisdom.quote}」</p>
              <p className="text-sm text-stone-400 tracking-widest">— {wisdom.author}</p>
            </div>
          )}
        </div>

        <CircularTimer timeLeft={timeLeft} totalTime={duration} />

        <div className="mt-12 flex items-center space-x-8">
          <button onClick={handleReset} className="p-4 bg-white shadow-sm border border-stone-200 rounded-2xl hover:bg-stone-50 transition-all text-stone-400">
            <RotateCcw size={24} />
          </button>
          {status === TimerStatus.RUNNING ? (
            <button onClick={handlePause} className="w-20 h-20 bg-emerald-600 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-emerald-200 hover:scale-105 active:scale-95 transition-all">
              <Pause size={32} />
            </button>
          ) : (
            <button onClick={handleStart} disabled={timeLeft === 0} className="w-20 h-20 bg-emerald-600 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-emerald-200 hover:scale-105 active:scale-95 transition-all disabled:bg-stone-300">
              <Play size={32} fill="currentColor" className="ml-1" />
            </button>
          )}
          <button onClick={() => setIsAudioEnabled(!isAudioEnabled)} className={`p-4 bg-white shadow-sm border border-stone-200 rounded-2xl transition-all ${isAudioEnabled ? 'text-emerald-600' : 'text-stone-400'}`}>
            {isAudioEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
          </button>
        </div>

        {showSettings && (
          <div className="mt-8 max-w-sm w-full bg-white p-6 rounded-3xl shadow-2xl border border-stone-100 animate-in zoom-in-95 duration-200">
            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-6">设定时长</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-serif-sc font-bold text-emerald-700">{duration / 60} <span className="text-sm font-normal text-stone-400">分钟</span></span>
                <input type="range" min="1" max="120" step="1" value={duration / 60} onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setDuration(val * 60);
                  if (status === TimerStatus.IDLE) setTimeLeft(val * 60);
                }} className="w-2/3 h-1.5 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="w-full max-w-4xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><BookOpen size={20} /></div>
              <h4 className="font-bold">要领</h4>
            </div>
            <p className="text-sm text-stone-500 leading-relaxed">{wisdom?.advice || "保持呼吸平稳，意守丹田。"}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-stone-50 text-stone-600 rounded-xl"><Calendar size={20} /></div>
              <h4 className="font-bold">日志</h4>
            </div>
            <div className="space-y-3 max-h-32 overflow-y-auto pr-2 custom-scrollbar text-xs">
              {history.length > 0 ? history.slice(0, 5).map(item => (
                <div key={item.id} className="flex justify-between py-1 border-b border-stone-50 last:border-0 text-stone-500">
                  <span>{item.date}</span>
                  <span className="font-bold text-emerald-600">{Math.floor(item.duration / 60)} 分钟</span>
                </div>
              )) : <p className="text-stone-400 italic">虚位以待</p>}
            </div>
          </div>
        </div>
      </footer>

      {isPunchInModalOpen && blessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white max-w-sm w-full rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="bg-emerald-600 p-10 text-center text-white">
              <CheckCircle2 size={48} className="mx-auto mb-4 text-emerald-200" />
              <h2 className="text-3xl font-serif-sc font-bold tracking-widest">{blessing.title}</h2>
            </div>
            <div className="p-10 text-center">
              <p className="text-stone-600 font-serif-sc leading-relaxed text-lg mb-8 italic">“{blessing.message}”</p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-stone-50 p-4 rounded-2xl"><p className="text-[10px] text-stone-400 uppercase">时长</p><p className="text-lg font-bold">{Math.floor(duration / 60)} m</p></div>
                <div className="bg-emerald-50 p-4 rounded-2xl"><p className="text-[10px] text-emerald-400 uppercase">连修</p><p className="text-lg font-bold text-emerald-700">{streak} d</p></div>
              </div>
              <div className="flex flex-col space-y-3">
                <button onClick={handleShare} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-emerald-700 transition-all">
                  <Share2 size={18} />
                  <span>{copyFeedback ? "已复制到剪贴板" : "分享修行成就"}</span>
                </button>
                <button onClick={() => setIsPunchInModalOpen(false)} className="w-full py-4 bg-stone-100 text-stone-500 rounded-2xl font-bold hover:bg-stone-200">
                  返回
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e7e5e4; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;
