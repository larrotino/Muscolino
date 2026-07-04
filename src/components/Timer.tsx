/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, AlertTriangle } from 'lucide-react';

interface TimerProps {
  initialSeconds?: number;
  onComplete?: () => void;
  autoStartOnSet?: boolean;
  onAutoStartChange?: (val: boolean) => void;
  trigger?: number;
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

export default function Timer({ 
  initialSeconds = 60, 
  onComplete, 
  autoStartOnSet = true, 
  onAutoStartChange,
  trigger = 0 
}: TimerProps) {
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

  // Handle auto-start trigger
  useEffect(() => {
    if (trigger > 0 && autoStartOnSet) {
      setDuration(initialSeconds);
      setTimeLeft(initialSeconds);
      setIsRunning(true);
    }
  }, [trigger, autoStartOnSet, initialSeconds]);

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
  const strokeDashoffset = 251.3 - (251.3 * percentage) / 100; // Radius = 40, Circumference = 2 * PI * 40 ≈ 251.3

  return (
    <div id="rest-timer-widget" className="bg-slate-900/95 backdrop-blur-md border border-white/15 rounded-2xl p-4 shadow-2xl relative overflow-hidden w-64 pointer-events-auto select-none">
      {/* Decorative Background Glow */}
      <div className={`absolute -right-10 -top-10 w-24 h-24 rounded-full blur-3xl transition-all duration-700 ${isRunning ? 'bg-emerald-500/10' : 'bg-amber-500/5'}`}></div>
      
      <div className="flex flex-col gap-4">
        {/* Header containing title and control buttons */}
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <h3 className="font-semibold text-slate-200 text-[11px] tracking-wide uppercase font-mono">Timer di Recupero</h3>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-slate-250 transition"
              title={isMuted ? "Attiva audio" : "Disattiva audio"}
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3.5">
          {/* Circular Display */}
          <div className="relative flex items-center justify-center w-24 h-24 flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              {/* Background track */}
              <circle
                cx="56"
                cy="56"
                r="40"
                className="stroke-white/10 fill-none"
                strokeWidth="4"
              />
              {/* Active progress */}
              <circle
                cx="48"
                cy="48"
                r="40"
                className={`fill-none transition-all duration-300 ${timeLeft === 0 ? 'stroke-amber-500' : isRunning ? 'stroke-emerald-400' : 'stroke-slate-500'}`}
                strokeWidth="4"
                strokeDasharray={251.3}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-mono font-bold text-slate-100 tracking-wider">
                {formatTime(timeLeft)}
              </span>
              <span className="text-[9px] text-slate-400 mt-0.5 font-medium tracking-wide">
                {timeLeft === 0 ? 'Fatto!' : isRunning ? 'Recupero...' : 'In pausa'}
              </span>
            </div>
          </div>

          {/* Controls & Presets */}
          <div className="w-full">
            {/* Preset Buttons */}
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {[45, 60, 90].map((preset) => (
                <button
                  key={preset}
                  onClick={() => handlePreset(preset)}
                  className={`py-1 text-[11px] font-mono font-semibold rounded-lg transition-all ${
                    duration === preset && timeLeft === preset
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-md shadow-emerald-500/5'
                      : 'bg-black/30 hover:bg-white/10 text-slate-350 border border-white/5'
                  }`}
                >
                  {preset >= 60 ? `${preset / 60}m` : `${preset}s`}
                </button>
              ))}
            </div>

            {/* Playback Controls & Manual Tuning */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleStart}
                className={`flex-1 py-1.5 px-3 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition text-xs ${
                  isRunning
                    ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold shadow-lg shadow-emerald-500/20'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause size={14} fill="currentColor" />
                    Pausa
                  </>
                ) : (
                  <>
                    <Play size={14} fill="currentColor" />
                    Avvia
                  </>
                )}
              </button>

              <button
                onClick={handleReset}
                className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 hover:text-slate-100 transition"
                title="Azzera"
              >
                <RotateCcw size={14} />
              </button>
            </div>

            {onAutoStartChange && (
              <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={autoStartOnSet}
                      onChange={(e) => onAutoStartChange(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-7 h-4 rounded-full transition-colors ${autoStartOnSet ? 'bg-blue-500' : 'bg-white/10'}`}></div>
                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-slate-100 transition-transform ${autoStartOnSet ? 'translate-x-3' : 'translate-x-0'}`}></div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold text-slate-250 group-hover:text-slate-100 transition-colors">
                      Auto-start timer
                    </span>
                  </div>
                </label>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {timeLeft === 0 && (
        <div className="absolute inset-x-0 bottom-0 bg-amber-500 text-slate-950 py-1 px-4 text-center text-[10px] font-bold flex items-center justify-center gap-1.5 animate-pulse">
          <AlertTriangle size={11} />
          <span>Recupero terminato!</span>
        </div>
      )}
    </div>
  );
}
