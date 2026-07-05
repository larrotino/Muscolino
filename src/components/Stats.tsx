/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { WorkoutSession, WeekTemplate } from '../types';
import { TrendingUp, Dumbbell, Calendar, Weight, RefreshCw, BarChart2, Info } from 'lucide-react';

interface StatsProps {
  sessions: WorkoutSession[];
  workoutProgram: WeekTemplate[];
  onGenerateMockData?: () => void;
  onClearData?: () => void;
}

export default function Stats({ sessions, workoutProgram, onGenerateMockData, onClearData }: StatsProps) {
  const [selectedExerciseFilter, setSelectedExerciseFilter] = useState<string>('Trazioni al mento');
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  // Filter out completed sessions
  const completedSessions = sessions.filter(s => s.completed).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Aggregate metrics
  const totalWorkouts = completedSessions.length;
  const lastSession = completedSessions[completedSessions.length - 1];
  
  // Calculate current personal weight
  const latestWeight = lastSession ? lastSession.personalWeight : 0;
  
  // Find distinct exercises logged across all sessions
  const allLoggedExercises = Array.from(
    new Set(
      completedSessions.flatMap(s => s.exercises.map(e => e.exerciseName))
    )
  );

  // Default filter to first available or fallback
  const activeExerciseFilter = allLoggedExercises.includes(selectedExerciseFilter) 
    ? selectedExerciseFilter 
    : allLoggedExercises[0] || 'Trazioni al mento';

  // Calculate volume, max reps, and Strength Score for selected exercise over time
  const exerciseHistory = completedSessions.map(session => {
    const exercise = session.exercises.find(e => e.exerciseName.toLowerCase().includes(activeExerciseFilter.toLowerCase()));
    if (!exercise) return null;
    
    // Find template to get isIsometric and difficulty
    const template = workoutProgram
      ?.flatMap(p => p.days.flatMap(d => d.exercises))
      ?.find(ex => ex.name.toLowerCase() === exercise.exerciseName.toLowerCase() || ex.id === exercise.exerciseId);

    const isIsometric = template?.isIsometric ?? false;
    const difficulty = template?.difficulty ?? 1;

    // Total reps = sum of reps of all completed sets
    const totalReps = exercise.sets.reduce((sum, s) => sum + (s.completed ? s.reps : 0), 0);
    // Max weight used in session
    const maxWeight = exercise.sets.reduce((max, s) => s.completed && s.weight > max ? s.weight : max, 0);
    // Estimated volume = sum(reps * weight) (or reps if bodyweight)
    const totalVolume = exercise.sets.reduce((sum, s) => sum + (s.completed ? s.reps * (s.weight || 1) : 0), 0);

    // Calculate maximum Strength Score achieved in any completed set during this session
    let maxStrengthScore = 0;
    let bestSetReps = 0;
    let bestSetWeight = 0;

    exercise.sets.forEach(s => {
      if (s.completed) {
        // Formula: Punteggio di Forza = (Peso Corporeo + Zavorra) * (1 + [Reps o (Secondi / 2.5)] / 30) * Difficoltà
        const repsValue = isIsometric ? (s.reps / 2.5) : s.reps;
        const multiplier = 1 + (repsValue / 30);
        const score = (session.personalWeight + s.weight) * multiplier * difficulty;
        if (score > maxStrengthScore) {
          maxStrengthScore = score;
          bestSetReps = s.reps;
          bestSetWeight = s.weight;
        }
      }
    });

    const strengthScore = parseFloat(maxStrengthScore.toFixed(1));

    return {
      date: new Date(session.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
      dateRaw: session.date,
      totalReps,
      maxWeight,
      totalVolume,
      strengthScore,
      bestSetReps,
      bestSetWeight,
      isIsometric,
      difficulty,
      week: session.week,
      day: session.day
    };
  }).filter((h): h is NonNullable<typeof h> => h !== null);

  // Format historical weights for chart
  const weightHistory = completedSessions.map(session => ({
    date: new Date(session.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
    weight: session.personalWeight,
    week: session.week,
    day: session.day
  })).filter(item => item.weight > 0);

  // Helper to generate coordinates for SVG Line Chart
  const getSvgCoordinates = (data: number[], width: number, height: number, padding = 40) => {
    if (data.length === 0) return '';
    if (data.length === 1) return `M ${padding} ${height / 2} L ${width - padding} ${height / 2}`;

    const maxVal = Math.max(...data);
    const minVal = Math.min(...data);
    const valRange = maxVal - minVal === 0 ? 1 : maxVal - minVal;

    const points = data.map((val, idx) => {
      const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
      // Invert Y because SVG 0,0 is top-left
      const y = height - padding - ((val - minVal) / valRange) * (height - padding * 2);
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  };

  // SVG dimensions
  const chartWidth = 600;
  const chartHeight = 250;
  const chartPadding = 45;

  return (
    <div id="stats-dashboard" className="space-y-8">
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-4 shadow-xl">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-300">
            <Dumbbell size={20} />
          </div>
          <div>
            <div className="text-[10px] text-slate-450 font-semibold uppercase tracking-wider font-mono">Workout Totali</div>
            <div className="text-2xl font-mono font-bold text-slate-100">{totalWorkouts}</div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-4 shadow-xl">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-300">
            <TrendingUp size={20} />
          </div>
          <div>
            <div className="text-[10px] text-slate-455 font-semibold uppercase tracking-wider font-mono">Fase Attuale</div>
            <div className="text-md font-semibold text-slate-100 mt-0.5 font-display">
              {lastSession ? lastSession.phase : 'Nessuna'}
            </div>
            {lastSession && (
              <div className="text-[10px] text-slate-450 font-mono">Settimana {lastSession.week}</div>
            )}
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-4 shadow-xl">
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-300">
            <Weight size={20} />
          </div>
          <div>
            <div className="text-[10px] text-slate-450 font-semibold uppercase tracking-wider font-mono">Ultimo Peso</div>
            <div className="text-2xl font-mono font-bold text-slate-100">
              {latestWeight > 0 ? `${latestWeight} kg` : '--'}
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-4 shadow-xl">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-300">
            <Calendar size={20} />
          </div>
          <div>
            <div className="text-[10px] text-slate-450 font-semibold uppercase tracking-wider font-mono">Ultimo Allenamento</div>
            <div className="text-md font-semibold text-slate-100 mt-0.5 font-display">
              {lastSession ? `Giorno ${lastSession.day}` : 'Nessuno'}
            </div>
            {lastSession && (
              <div className="text-[10px] text-slate-450 font-mono">
                {new Date(lastSession.date).toLocaleDateString('it-IT')}
              </div>
            )}
          </div>
        </div>
      </div>

      {totalWorkouts < 2 ? (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 text-center max-w-xl mx-auto space-y-6 shadow-xl">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <BarChart2 size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-200 font-display">Statistiche non ancora disponibili</h3>
            <p className="text-sm text-slate-450 leading-relaxed font-light">
              Hai completato <strong>{totalWorkouts}</strong> sessioni. Completa almeno <strong>2 allenamenti</strong> per sbloccare l'andamento temporale del peso, il volume d'allenamento e l'analisi del progresso della forza.
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            {onGenerateMockData && (
              <button
                onClick={onGenerateMockData}
                className="px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition uppercase tracking-wider shadow-lg shadow-blue-500/20"
              >
                <RefreshCw size={14} />
                Genera Dati di Esempio (12 Settimane)
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chart 1: Personal Weight over time */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="font-bold text-slate-200 text-base font-display">Andamento Peso Personale</h4>
                <p className="text-xs text-slate-450">Traccia il peso corporeo registrato all'inizio di ogni sessione</p>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 bg-rose-500/10 text-rose-300 rounded-lg border border-rose-500/25">
                kg
              </span>
            </div>

            {weightHistory.length >= 2 ? (
              <div className="relative w-full pt-4">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible">
                  {/* Grid lines & values */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                    const weights = weightHistory.map(w => w.weight);
                    const maxW = Math.max(...weights);
                    const minW = Math.min(...weights);
                    const diff = maxW - minW === 0 ? 1 : maxW - minW;
                    const gridWeight = minW + diff * ratio;
                    const y = chartHeight - chartPadding - ratio * (chartHeight - chartPadding * 2);

                    return (
                      <g key={idx} className="opacity-40">
                        <line
                          x1={chartPadding}
                          y1={y}
                          x2={chartWidth - chartPadding}
                          y2={y}
                          className="stroke-white/10"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                        />
                        <text
                          x={chartPadding - 8}
                          y={y + 4}
                          className="fill-slate-400 text-[10px] font-mono text-right"
                          textAnchor="end"
                        >
                          {gridWeight.toFixed(1)}
                        </text>
                      </g>
                    );
                  })}

                  {/* SVG Path line */}
                  <path
                    d={getSvgCoordinates(weightHistory.map(w => w.weight), chartWidth, chartHeight, chartPadding)}
                    className="stroke-rose-400 fill-none"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Chart Points */}
                  {weightHistory.map((item, idx) => {
                    const weights = weightHistory.map(w => w.weight);
                    const maxW = Math.max(...weights);
                    const minW = Math.min(...weights);
                    const diff = maxW - minW === 0 ? 1 : maxW - minW;
                    const x = chartPadding + (idx / (weightHistory.length - 1)) * (chartWidth - chartPadding * 2);
                    const y = chartHeight - chartPadding - ((item.weight - minW) / diff) * (chartHeight - chartPadding * 2);

                    return (
                      <g key={idx} className="group">
                        <circle
                          cx={x}
                          cy={y}
                          r="5"
                          className="fill-rose-400 stroke-black/50 cursor-pointer"
                          strokeWidth="2"
                        />
                        <rect
                          x={x - 25}
                          y={y - 28}
                          width="50"
                          height="20"
                          rx="4"
                          className="fill-black/80 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none stroke-white/10"
                          strokeWidth="1"
                        />
                        <text
                          x={x}
                          y={y - 14}
                          className="fill-slate-100 text-[10px] font-mono font-bold text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                          textAnchor="middle"
                        >
                          {item.weight} kg
                        </text>
                        {/* Date under the chart */}
                        {idx === 0 || idx === weightHistory.length - 1 || (weightHistory.length < 8 && idx % 2 === 0) ? (
                          <text
                            x={x}
                            y={chartHeight - 12}
                            className="fill-slate-500 text-[9px] font-mono"
                            textAnchor="middle"
                          >
                            {item.date} (S{item.week}G{item.day})
                          </text>
                        ) : null}
                      </g>
                    );
                  })}
                </svg>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-xs text-slate-500">
                Pochi record di peso registrati.
              </div>
            )}
          </div>

          {/* Chart 2: Exercise Performance / Vol */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-1">
                <h4 className="font-bold text-slate-200 text-base font-display">Andamento Punteggio di Forza</h4>
                <p className="text-xs text-slate-450">Traccia il massimale stimato (1RM modificato) delle migliori serie</p>
              </div>

              {/* Selector */}
              <select
                value={selectedExerciseFilter}
                onChange={(e) => setSelectedExerciseFilter(e.target.value)}
                className="bg-black/30 border border-white/10 text-xs text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500 transition"
              >
                {allLoggedExercises.length > 0 ? (
                  allLoggedExercises.map(exName => (
                    <option key={exName} value={exName} className="bg-slate-950">
                       {exName}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Trazioni al mento" className="bg-slate-950">Trazioni al mento</option>
                    <option value="Push-up" className="bg-slate-950">Push-up</option>
                    <option value="Bulgarian Split Squat" className="bg-slate-950">Bulgarian Split Squat</option>
                  </>
                )}
              </select>
            </div>

            {exerciseHistory.length >= 2 ? (
              <div className="relative w-full pt-4 space-y-4">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible">
                  {/* Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                    const values = exerciseHistory.map(h => h.strengthScore);
                    const maxV = Math.max(...values);
                    const minV = Math.min(...values);
                    const diff = maxV - minV === 0 ? 1 : maxV - minV;
                    const gridVal = minV + diff * ratio;
                    const y = chartHeight - chartPadding - ratio * (chartHeight - chartPadding * 2);

                    return (
                      <g key={idx} className="opacity-40">
                        <line
                          x1={chartPadding}
                          y1={y}
                          x2={chartWidth - chartPadding}
                          y2={y}
                          className="stroke-white/10"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                        />
                        <text
                          x={chartPadding - 8}
                          y={y + 4}
                          className="fill-slate-400 text-[10px] font-mono text-right"
                          textAnchor="end"
                        >
                          {gridVal.toFixed(1)}
                        </text>
                      </g>
                    );
                  })}

                  {/* SVG Path line */}
                  <path
                    d={getSvgCoordinates(exerciseHistory.map(h => h.strengthScore), chartWidth, chartHeight, chartPadding)}
                    className="stroke-amber-400 fill-none"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Chart Points */}
                  {exerciseHistory.map((item, idx) => {
                    const values = exerciseHistory.map(h => h.strengthScore);
                    const maxV = Math.max(...values);
                    const minV = Math.min(...values);
                    const diff = maxV - minV === 0 ? 1 : maxV - minV;
                    const x = chartPadding + (idx / (exerciseHistory.length - 1)) * (chartWidth - chartPadding * 2);
                    const y = chartHeight - chartPadding - ((item.strengthScore - minV) / diff) * (chartHeight - chartPadding * 2);

                    return (
                      <g key={idx} className="group">
                        <circle
                          cx={x}
                          cy={y}
                          r="5"
                          className="fill-amber-400 stroke-black/50 cursor-pointer"
                          strokeWidth="2"
                        />
                        <rect
                          x={x - 45}
                          y={y - 30}
                          width="90"
                          height="22"
                          rx="4"
                          className="fill-black/90 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none stroke-white/10 shadow-lg"
                          strokeWidth="1"
                        />
                        <text
                          x={x}
                          y={y - 15}
                          className="fill-amber-300 text-[9px] font-mono font-bold text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                          textAnchor="middle"
                        >
                          {item.strengthScore} pt ({item.bestSetReps}{item.isIsometric ? 's' : ''} @ {item.bestSetWeight}kg)
                        </text>
                        {/* Date label under the chart */}
                        {idx === 0 || idx === exerciseHistory.length - 1 || (exerciseHistory.length < 8 && idx % 2 === 0) ? (
                          <text
                            x={x}
                            y={chartHeight - 12}
                            className="fill-slate-500 text-[9px] font-mono"
                            textAnchor="middle"
                          >
                            {item.date} (S{item.week}G{item.day})
                          </text>
                        ) : null}
                      </g>
                    );
                  })}
                </svg>
                
                {/* Legend */}
                <div className="flex justify-center gap-6 text-xs pt-1">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    <span className="text-slate-450 font-mono text-[10px]">Massimale Stimato Modificato (pt)</span>
                  </div>
                </div>

                {/* Formula explanation */}
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 flex gap-3 text-xs leading-relaxed text-slate-400 font-light font-mono">
                  <Info size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-amber-350 block mb-1">Punteggio di Forza (Formula):</span>
                    <span>Punteggio = (Peso Corporeo + Zavorra) × (1 + [Reps o (Secondi / 2.5)] / 30) × Difficoltà</span>
                    <div className="text-[10px] text-slate-500 mt-1">
                      Calcolato automaticamente sulla serie migliore di ogni sessione, adattando sia esercizi isometrici che classici.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-xs text-slate-500 gap-2">
                <Info size={16} />
                <span>Nessuna prestazione registrata per l'esercizio selezionato.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin operations */}
      <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row gap-3 justify-between items-center text-slate-400">
        <p className="text-xs text-slate-500 font-mono">I dati sono salvati localmente sul browser.</p>
        <div className="flex gap-3">
          {onGenerateMockData && sessions.length === 0 && (
            <button
              onClick={onGenerateMockData}
              className="px-3 py-1.5 hover:bg-white/10 hover:text-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 bg-white/5 border border-white/10 font-mono"
            >
              <RefreshCw size={12} />
              Popola Dati Demo
            </button>
          )}
          {onClearData && (
            showClearConfirm ? (
              <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl">
                <span className="text-[10px] text-rose-300 font-mono font-bold uppercase mr-1">Sei sicuro?</span>
                <button
                  onClick={() => {
                    onClearData();
                    setShowClearConfirm(false);
                  }}
                  className="text-[10px] bg-rose-600 hover:bg-rose-500 text-white px-2.5 py-1 rounded-lg transition font-mono font-bold uppercase tracking-wider"
                >
                  Sì, Cancella Tutto
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="text-[10px] bg-white/5 hover:bg-white/10 text-slate-300 px-2.5 py-1 rounded-lg transition font-mono"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-xl text-xs font-semibold transition border border-rose-500/35 font-mono"
              >
                Cancellazione Completa
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
