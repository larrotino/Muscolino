/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Area, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { Activity, TrendingUp, Calendar, Zap, Info } from 'lucide-react';
import { WorkoutSession, WeekTemplate, ExerciseTemplate } from '../types';

interface WorkoutAnalyticsChartProps {
  sessions: WorkoutSession[];
  workoutProgram: WeekTemplate[];
}

type TimeRange = '3m' | '1y' | 'all';

// ISO Week calculation helper
function getISOWeekInfo(date: Date) {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  const year = target.getFullYear();
  return {
    key: `${year}-W${weekNumber < 10 ? '0' + weekNumber : weekNumber}`,
    label: `Sett. ${weekNumber}`,
    weekNumber,
    year
  };
}

// Compute metrics for a single session
function computeSessionMetrics(session: WorkoutSession, workoutProgram: WeekTemplate[]) {
  let totalScore = 0;
  let totalReps = 0;
  const pWeight = session.personalWeight > 0 ? session.personalWeight : 75;

  session.exercises.forEach(ex => {
    let template: ExerciseTemplate | undefined;
    for (const weekGroup of workoutProgram) {
      for (const dayT of weekGroup.days) {
        const found = dayT.exercises.find(
          e => e.id === ex.exerciseId || e.name.toLowerCase().trim() === ex.exerciseName.toLowerCase().trim()
        );
        if (found) {
          template = found;
          break;
        }
      }
      if (template) break;
    }

    const isIso = template?.isIsometric || 
      ex.exerciseName.toLowerCase().includes('plank') || 
      ex.exerciseName.toLowerCase().includes('barchetta') || 
      ex.exerciseName.toLowerCase().includes('hollow');
    const diff = template?.difficulty ?? 1;

    ex.sets.forEach(set => {
      if (set.completed || (set.reps && set.reps > 0)) {
        const reps = Number(set.reps) || 0;
        const weight = Number(set.weight) || 0;
        const effectiveReps = isIso ? (reps / 2.5) : reps;
        const setWeight = pWeight + weight;
        const setScore = setWeight * (1 + (effectiveReps / 30)) * diff;
        totalScore += setScore;
        totalReps += reps;
      }
    });
  });

  return {
    reps: Math.round(totalReps),
    strengthScore: Math.round(totalScore)
  };
}

// Custom Tooltip component
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 border border-white/15 rounded-xl p-3.5 shadow-2xl backdrop-blur-md min-w-[240px]">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2 mb-2.5">
          <span className="font-semibold text-slate-200 text-xs">{data.fullDate}</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
            {data.dayLabel}
          </span>
        </div>

        <div className="space-y-2.5 text-xs">
          {/* Weekly Repetition Load */}
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-blue-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              Carico Reps Settimana:
            </span>
            <span className="font-mono font-bold text-white text-sm">
              {data.weeklyRepsLoad.toLocaleString('it-IT')} <span className="text-xs font-normal text-slate-400">reps</span>
            </span>
          </div>

          {/* Current Session Reps */}
          <div className="flex items-center justify-between gap-3 text-[11px] text-slate-400 pl-4">
            <span>Reps di questa seduta:</span>
            <span className="font-mono text-slate-300 font-semibold">{data.sessionReps} reps</span>
          </div>

          {/* Session Strength Score */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10">
            <span className="flex items-center gap-1.5 text-amber-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              Punteggio Forza Seduta:
            </span>
            <span className="font-mono font-bold text-amber-300 text-sm">
              {data.sessionStrengthScore.toLocaleString('it-IT')} <span className="text-xs font-normal text-amber-400/70">pt</span>
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function WorkoutAnalyticsChart({ sessions, workoutProgram }: WorkoutAnalyticsChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('3m');

  // Filter and process session data based on selected time range
  const chartData = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];

    const now = Date.now();
    let cutoff = 0;
    if (timeRange === '3m') {
      cutoff = now - 90 * 24 * 60 * 60 * 1000;
    } else if (timeRange === '1y') {
      cutoff = now - 365 * 24 * 60 * 60 * 1000;
    }

    // Filter valid sessions with some completed sets or reps
    const validSessions = sessions
      .filter(s => {
        const timestamp = new Date(s.date).getTime();
        if (cutoff > 0 && timestamp < cutoff) return false;
        // Keep sessions that have sets logged
        return s.exercises && s.exercises.some(e => e.sets && e.sets.some(st => st.completed || (st.reps && st.reps > 0)));
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (validSessions.length === 0) return [];

    // Precalculate metrics for each session
    const sessionItems = validSessions.map(s => {
      const d = new Date(s.date);
      const metrics = computeSessionMetrics(s, workoutProgram);
      const weekInfo = getISOWeekInfo(d);
      return {
        session: s,
        date: d,
        metrics,
        weekInfo
      };
    });

    // Calculate weekly reps load grouped by weekInfo.key
    const weeklyRepsMap: Record<string, number> = {};
    sessionItems.forEach(item => {
      weeklyRepsMap[item.weekInfo.key] = (weeklyRepsMap[item.weekInfo.key] || 0) + item.metrics.reps;
    });

    // Map to final chart data array
    return sessionItems.map(item => {
      const shortDate = item.date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
      const fullDate = item.date.toLocaleDateString('it-IT', { 
        weekday: 'short', 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      });

      return {
        id: item.session.id,
        timestamp: item.date.getTime(),
        dateLabel: `${shortDate} (${item.session.day})`,
        fullDate,
        dayLabel: `Giorno ${item.session.day} • Sett. ${item.session.week}`,
        sessionStrengthScore: item.metrics.strengthScore,
        sessionReps: item.metrics.reps,
        weeklyRepsLoad: weeklyRepsMap[item.weekInfo.key] || item.metrics.reps,
        weekKey: item.weekInfo.key,
        weekLabel: item.weekInfo.label
      };
    });
  }, [sessions, workoutProgram, timeRange]);

  // Aggregate statistics for the KPI header
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return { totalSessions: 0, avgWeeklyReps: 0, lastStrength: 0, maxStrength: 0 };
    }

    const uniqueWeeks = new Set(chartData.map(d => d.weekKey));
    const weeklyLoads = Array.from(uniqueWeeks).map(wk => {
      const first = chartData.find(d => d.weekKey === wk);
      return first ? first.weeklyRepsLoad : 0;
    });

    const avgWeeklyReps = weeklyLoads.length > 0 
      ? Math.round(weeklyLoads.reduce((a, b) => a + b, 0) / weeklyLoads.length) 
      : 0;

    const lastStrength = chartData[chartData.length - 1].sessionStrengthScore;
    const maxStrength = Math.max(...chartData.map(d => d.sessionStrengthScore));

    return {
      totalSessions: chartData.length,
      avgWeeklyReps,
      lastStrength,
      maxStrength
    };
  }, [chartData]);

  return (
    <section 
      id="analytics-chart-section"
      className="mt-8 bg-slate-900/80 border border-white/10 rounded-2xl p-5 md:p-6 backdrop-blur-sm shadow-xl space-y-6"
    >
      {/* Header with Title & Time Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <TrendingUp size={18} />
            </span>
            <h3 className="text-base md:text-lg font-bold text-white tracking-tight">
              Progressione Carico & Forza
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Confronto tra il volume di ripetizioni settimanali e il punteggio di forza effettivo di ogni seduta
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="inline-flex bg-slate-800/80 p-1 rounded-xl border border-white/10 self-start sm:self-auto shrink-0 shadow-inner">
          <button
            onClick={() => setTimeRange('3m')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              timeRange === '3m'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            3 Mesi
          </button>
          <button
            onClick={() => setTimeRange('1y')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              timeRange === '1y'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            1 Anno
          </button>
          <button
            onClick={() => setTimeRange('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              timeRange === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Totale
          </button>
        </div>
      </div>

      {/* KPI Badges */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white/5 border border-white/5 rounded-xl p-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
              Sedute Nel Periodo
            </span>
            <span className="text-lg font-mono font-extrabold text-white">
              {stats.totalSessions}
            </span>
          </div>

          <div className="bg-white/5 border border-white/5 rounded-xl p-3">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block font-mono">
              Media Reps/Settimana
            </span>
            <span className="text-lg font-mono font-extrabold text-blue-300">
              {stats.avgWeeklyReps} <span className="text-xs font-normal text-slate-400">reps</span>
            </span>
          </div>

          <div className="bg-white/5 border border-white/5 rounded-xl p-3">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block font-mono">
              Ultimo Punteggio Forza
            </span>
            <span className="text-lg font-mono font-extrabold text-amber-300">
              {stats.lastStrength} <span className="text-xs font-normal text-slate-400">pt</span>
            </span>
          </div>

          <div className="bg-white/5 border border-white/5 rounded-xl p-3">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block font-mono">
              Picco Massimo Forza
            </span>
            <span className="text-lg font-mono font-extrabold text-emerald-300">
              {stats.maxStrength} <span className="text-xs font-normal text-slate-400">pt</span>
            </span>
          </div>
        </div>
      )}

      {/* Chart Area or Empty State */}
      {chartData.length === 0 ? (
        <div className="py-12 px-4 rounded-xl border border-dashed border-white/10 bg-black/20 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Activity size={24} />
          </div>
          <div className="max-w-md space-y-1">
            <h4 className="text-sm font-bold text-slate-200">
              Nessuna seduta registrata in questo intervallo temporale
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Completa un allenamento salvando le serie e le ripetizioni per tracciare automaticamente l'andamento del volume settimanale e il punteggio di forza della sessione.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-400 pt-2 border-t border-white/5">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              Carico Ripetizioni Settimanali (Asse sinistro)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Punteggio Forza per Seduta (Asse destro)
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="w-full h-[320px] sm:h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 15, right: 10, left: -10, bottom: 25 }}
              >
                <defs>
                  <linearGradient id="repsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} opacity={0.5} />

                {/* X-Axis: Seduta (Data e Giorno) */}
                <XAxis 
                  dataKey="dateLabel" 
                  stroke="#94a3b8" 
                  fontSize={11}
                  tickLine={false}
                  dy={8}
                />

                {/* Left Y-Axis: Weekly Repetition Load */}
                <YAxis 
                  yAxisId="reps" 
                  stroke="#60a5fa" 
                  fontSize={11}
                  tickLine={false}
                  domain={[0, 'auto']}
                  tickFormatter={(val) => `${val}`}
                />

                {/* Right Y-Axis: Session Strength Score */}
                <YAxis 
                  yAxisId="strength" 
                  orientation="right" 
                  stroke="#fbbf24" 
                  fontSize={11}
                  tickLine={false}
                  domain={[0, 'auto']}
                  tickFormatter={(val) => `${val}`}
                />

                <Tooltip content={<CustomTooltip />} />

                <Legend 
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: '12px', fontSize: '11px' }}
                  formatter={(value) => {
                    if (value === 'weeklyRepsLoad') {
                      return <span className="text-blue-400 font-semibold">Carico Ripetizioni Settimanale (reps)</span>;
                    }
                    if (value === 'sessionStrengthScore') {
                      return <span className="text-amber-400 font-semibold">Punteggio Forza Seduta (pt)</span>;
                    }
                    return value;
                  }}
                />

                {/* Area: Carico di Ripetizioni Fatte per Settimana (Andamento Costante) */}
                <Area 
                  yAxisId="reps"
                  type="monotone"
                  dataKey="weeklyRepsLoad" 
                  name="weeklyRepsLoad"
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#repsGradient)" 
                />

                {/* Line: Punteggio Totale di Forza della Seduta (Carico Effettivo della Sessione) */}
                <Line 
                  yAxisId="strength"
                  type="monotone"
                  dataKey="sessionStrengthScore" 
                  name="sessionStrengthScore"
                  stroke="#fbbf24" 
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#fbbf24', stroke: '#0f172a', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#f59e0b', stroke: '#ffffff', strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Educational Caption */}
          <div className="flex items-start gap-2 text-[11px] text-slate-400 bg-white/5 border border-white/5 rounded-xl p-3">
            <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-slate-200">Guida alla lettura:</strong> La linea/area azzurra (<span className="text-blue-400 font-medium">Carico Reps Settimanale</span>) misura il volume globale delle ripetizioni eseguite durante la settimana per verificare se il ritmo di lavoro è costante. La linea dorata (<span className="text-amber-400 font-medium">Punteggio Forza Seduta</span>) quantifica l'intensità e il carico effettivo di ogni singola sessione calcolato in base al tuo peso, zavorre e difficoltà degli esercizi.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
