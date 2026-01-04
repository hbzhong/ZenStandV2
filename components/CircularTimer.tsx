
import React from 'react';

interface CircularTimerProps {
  timeLeft: number;
  totalTime: number;
}

const CircularTimer: React.FC<CircularTimerProps> = ({ timeLeft, totalTime }) => {
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
        <circle
          className="text-stone-200"
          strokeWidth="8"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="50%"
          cy="50%"
        />
        <circle
          className="text-emerald-600 transition-all duration-1000 ease-linear"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="50%"
          cy="50%"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-5xl md:text-6xl font-light text-stone-800 font-serif-sc">
          {formatTime(timeLeft)}
        </span>
        <span className="text-sm text-stone-400 mt-2 tracking-widest uppercase">
          {timeLeft > 0 ? "保持静止" : "圆满"}
        </span>
      </div>
    </div>
  );
};

export default CircularTimer;
