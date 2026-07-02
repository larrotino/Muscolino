/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react';

interface TimerProps {
  initialSeconds?: number;
  onComplete?: () => void;
  autoStartOnSet?: boolean;
}

export function playTimerBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    // First high beep
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.15);
    
    // Second higher beep
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1200, ctx.currentTime + 0.2); // high note
    gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc2.start(ctx.currentTime + 0.2);
    osc2.stop(ctx.currentTime + 0.4);
  } catch (err) {
    console.warn("L'audio non è abilitato nel browser o richiede interazione utente:", err);
  }
}

export default function Timer({ initialSeconds = 60, onComplete, autoStartOnSet = true }: TimerProps) {
  const [duration, setDuration] = useState(initialSeconds);
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with initialSeconds prop if it changes (e.g. user selects a different exercise)
  useEffect(() => {
    setDuration(initialSeconds);
    setTimeLeft(initialSeconds);
    setIsRunning(false);
  }, [initialSeconds]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            if (timerRef.current) clearInterval(timerRef.current);
            if (!isMuted) {
              playTimerBeep();
            }
            if (onComplete) onComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, isMuted, onComplete]);

  // Handle setting specific preset durations
  const handlePreset = (seconds: number) => {
    setIsRunning(false);
    setDuration(seconds);
    setTimeLeft(seconds);
  };

  const toggleStart = () => {
    if (timeLeft === 0) {
      setTimeLeft(duration);
    }
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(duration);
  };

  const adjustTime = (amount: number) => {
    setTimeLeft((prev) => {
      const newVal = prev + amount;
      return newVal < 0 ? 0 : newVal;
    });
    setDuration((prev) => {
      const newVal = prev + amount;
      return newVal < 5 ? 5 : newVal;
    });
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // Calculate percentage for circular progress
  const percentage = duration > 0 ? (timeLeft / duration) * 100 : 0;
  const strokeDashoffset = 282.6 - (282.6 * percentage) / 100; // Radius = 45, Circumference = 2 * PI * 45 ≈ 282.6

  return (
    <div id="rest-timer-widget" className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      {/* Decorative Background Glow */}
      <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl transition-all duration-700 ${isRunning ? 'bg-emerald-500/10' : 'bg-amber-500/5'}`}></div>
      
      <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
        {/* Circular Display */}
        <div className="relative flex items-center justify-center w-36 h-36 flex-shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background track */}
            <circle
              cx="72"
              cy="72"
              r="60"
              className="stroke-white/10 fill-none"
              strokeWidth="6"
            />
            {/* Active progress */}
            <circle
              cx="72"
              cy="72"
              r="60"
              className={`fill-none transition-all duration-300 ${timeLeft === 0 ? 'stroke-amber-500' : isRunning ? 'stroke-emerald-400' : 'stroke-slate-500'}`}
              strokeWidth="6"
              strokeDasharray={376.8} // 2 * Math.PI * 60 ≈ 376.8
              strokeDashoffset={376.8 - (376.8 * percentage) / 100}
              strokeLinecap="round"
            />
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-mono font-bold text-slate-100 tracking-wider">
              {formatTime(timeLeft)}
            </span>
            <span className="text-xs text-slate-400 mt-1 font-medium tracking-wide">
              {timeLeft === 0 ? 'Fatto!' : isRunning ? 'Recupero...' : 'In pausa'}
            </span>
          </div>
        </div>

        {/* Controls & Presets */}
        <div className="flex-1 w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-200 text-sm tracking-wide uppercase font-mono">Timer di Recupero</h3>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-450 hover:text-slate-200 transition"
                title={isMuted ? "Attiva audio" : "Disattiva audio"}
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[45, 60, 75, 90, 120].map((preset) => (
              <button
                key={preset}
                onClick={() => handlePreset(preset)}
                className={`py-1.5 text-xs font-mono font-semibold rounded-lg transition-all ${
                  duration === preset && timeLeft === preset
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-md shadow-emerald-500/5'
                    : 'bg-black/30 hover:bg-white/10 text-slate-350 border border-white/5'
                }`}
              >
                {preset >= 60 ? `${preset / 60}m` : `${preset}s`}
              </button>
            ))}
            <button
              onClick={() => handlePreset(150)}
              className={`py-1.5 text-xs font-mono font-semibold rounded-lg transition-all ${
                duration === 150 && timeLeft === 150
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-md shadow-emerald-500/5'
                  : 'bg-black/30 hover:bg-white/10 text-slate-350 border border-white/5'
              }`}
            >
              2.5m
            </button>
          </div>

          {/* Playback Controls & Manual Tuning */}
          <div className="flex items-center gap-3">
            <div className="flex bg-black/30 rounded-xl p-1 border border-white/10 backdrop-blur-sm">
              <button
                onClick={() => adjustTime(-15)}
                className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-100 font-mono font-bold hover:bg-white/10 rounded-lg transition"
                title="-15 secondi"
              >
                -15s
              </button>
              <button
                onClick={() => adjustTime(15)}
                className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-100 font-mono font-bold hover:bg-white/10 rounded-lg transition"
                title="+15 secondi"
              >
                +15s
              </button>
            </div>

            <button
              onClick={toggleStart}
              className={`flex-1 py-2.5 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition text-sm ${
                isRunning
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold shadow-lg shadow-emerald-500/20'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause size={16} fill="currentColor" />
                  Pausa
                </>
              ) : (
                <>
                  <Play size={16} fill="currentColor" />
                  Avvia
                </>
              )}
            </button>

            <button
              onClick={handleReset}
              className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 hover:text-slate-100 transition"
              title="Azzera"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </div>
      
      {timeLeft === 0 && (
        <div className="absolute inset-x-0 bottom-0 bg-amber-500 text-slate-950 py-1 px-4 text-center text-xs font-bold flex items-center justify-center gap-1.5 animate-pulse">
          <AlertTriangle size={12} />
          <span>Recupero terminato! Inizia la prossima serie.</span>
        </div>
      )}
    </div>
  );
}
