/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Dumbbell, Calendar, BarChart2, BookOpen, Clock, Weight, Flame, 
  Play, Square, Check, RotateCcw, Plus, Minus, Info, Settings,
  CheckCircle, ChevronRight, AlertCircle, Save, X, Sparkles, HelpCircle
} from 'lucide-react';

import { WorkoutSession, DayTemplate, ExerciseLog, SetLog, Phase } from './types';
import { WORKOUT_PROGRAM, getWorkoutForWeekAndDay, getPhaseForWeek } from './workoutProgram';
import Timer, { playTimerBeep } from './components/Timer';
import Stats from './components/Stats';
import History from './components/History';

export default function App() {
  // Navigation & Persistent Preferences State
  const [activeTab, setActiveTab] = useState<'allenamento' | 'cronologia' | 'statistiche' | 'scheda'>('allenamento');
  const [currentWeek, setCurrentWeek] = useState<number>(1);
  const [currentDay, setCurrentDay] = useState<'A' | 'B' | 'C'>('A');
  const [personalWeight, setPersonalWeight] = useState<number>(75);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  
  // Active Workout Session State
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionDurationSecs, setSessionDurationSecs] = useState<number>(0);
  const [timerTargetSeconds, setTimerTargetSeconds] = useState<number>(60);
  const [autoStartTimer, setAutoStartTimer] = useState<boolean>(true);
  const [workoutNotes, setWorkoutNotes] = useState<string>('');
  
  // Warm-up Checklist
  const [checkedWarmup, setCheckedWarmup] = useState<boolean[]>([]);
  
  // Circuit Specific Tracker State (Weeks 9-12 Day C)
  const [circuitRound, setCircuitRound] = useState<number>(1);
  const [completedCircuitExercises, setCompletedCircuitExercises] = useState<boolean[]>([false, false, false, false]);

  // Active Confirmation and Toast Notification States
  const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-dismiss notification toast
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Load data from LocalStorage on mount
  useEffect(() => {
    const savedSessions = localStorage.getItem('workout_sessions');
    if (savedSessions) {
      try {
        setSessions(JSON.parse(savedSessions));
      } catch (err) {
        console.error("Errore nel caricamento delle sessioni:", err);
      }
    }

    const savedWeek = localStorage.getItem('user_current_week');
    if (savedWeek) setCurrentWeek(parseInt(savedWeek, 10));

    const savedDay = localStorage.getItem('user_current_day');
    if (savedDay) setCurrentDay(savedDay as 'A' | 'B' | 'C');

    const savedWeight = localStorage.getItem('user_personal_weight');
    if (savedWeight) setPersonalWeight(parseFloat(savedWeight));
  }, []);

  // Update preferences in LocalStorage when they change
  useEffect(() => {
    localStorage.setItem('user_current_week', currentWeek.toString());
  }, [currentWeek]);

  useEffect(() => {
    localStorage.setItem('user_current_day', currentDay);
  }, [currentDay]);

  useEffect(() => {
    localStorage.setItem('user_personal_weight', personalWeight.toString());
  }, [personalWeight]);

  // Load last logged weight as fallback when starting session
  useEffect(() => {
    if (sessions.length > 0) {
      const sorted = [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const lastCompleted = sorted.find(s => s.completed);
      if (lastCompleted && lastCompleted.personalWeight > 0) {
        setPersonalWeight(lastCompleted.personalWeight);
      }
    }
  }, [sessions]);

  // Active workout duration counter
  useEffect(() => {
    if (activeSession && sessionStartTime) {
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
        setSessionDurationSecs(elapsed);
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      setSessionDurationSecs(0);
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [activeSession, sessionStartTime]);

  // Sync warmup checkbox array size when starting workout
  const currentWorkoutTemplate = getWorkoutForWeekAndDay(currentWeek, currentDay);
  useEffect(() => {
    if (currentWorkoutTemplate) {
      setCheckedWarmup(new Array(currentWorkoutTemplate.warmup.length).fill(false));
    }
  }, [currentWeek, currentDay]);

  // Initiate a workout session
  const startWorkout = () => {
    if (!currentWorkoutTemplate) return;

    // Create fresh initial exercise logs based on the active template
    const exerciseLogs: ExerciseLog[] = currentWorkoutTemplate.exercises.map(ex => {
      const sets: SetLog[] = [];
      const isCircuit = currentWorkoutTemplate.isCircuit;
      
      // In circuit, sets represent the round index (normally 3 rounds)
      const setsToCreate = isCircuit ? (currentWorkoutTemplate.circuitRounds || 3) : ex.targetSets;

      for (let i = 0; i < setsToCreate; i++) {
        // Parse target reps for numeric prefill (e.g. "8 / gamba" -> 8, "10-15" -> 12, "max -2" -> 8, "45-60 s" -> 45)
        let defaultReps = 10;
        const repsStr = ex.targetReps.toLowerCase();
        
        if (repsStr.includes('max')) {
          defaultReps = 8;
        } else if (repsStr.includes('-')) {
          const parts = repsStr.split('-')[0].replace(/[^0-9]/g, '');
          defaultReps = parseInt(parts, 10) || 10;
        } else {
          const cleaned = repsStr.replace(/[^0-9]/g, '');
          defaultReps = parseInt(cleaned, 10) || defaultReps;
        }

        sets.push({
          reps: defaultReps,
          weight: ex.defaultWeight,
          completed: false
        });
      }

      return {
        exerciseId: ex.id,
        exerciseName: ex.name,
        sets
      };
    });

    const { phase } = getPhaseForWeek(currentWeek);

    const newSession: WorkoutSession = {
      id: Math.random().toString(36).substring(2, 11),
      date: new Date().toISOString(),
      week: currentWeek,
      phase,
      day: currentDay,
      dayName: currentWorkoutTemplate.name,
      personalWeight: personalWeight,
      exercises: exerciseLogs,
      durationMinutes: 0,
      notes: '',
      completed: false
    };

    setActiveSession(newSession);
    setSessionStartTime(Date.now());
    setWorkoutNotes('');
    setCircuitRound(1);
    setCompletedCircuitExercises(new Array(currentWorkoutTemplate.exercises.length).fill(false));
  };

  // Toggle warm-up checkbox item
  const handleWarmupToggle = (idx: number) => {
    const updated = [...checkedWarmup];
    updated[idx] = !updated[idx];
    setCheckedWarmup(updated);
  };

  // Modify individual set properties in active workout
  const updateSet = (exerciseIdx: number, setIdx: number, fields: Partial<SetLog>) => {
    if (!activeSession) return;

    const updatedExercises = [...activeSession.exercises];
    updatedExercises[exerciseIdx].sets[setIdx] = {
      ...updatedExercises[exerciseIdx].sets[setIdx],
      ...fields
    };

    setActiveSession({
      ...activeSession,
      exercises: updatedExercises
    });

    // If marked as completed and autoStartTimer is enabled, trigger the countdown
    if (fields.completed === true) {
      const template = currentWorkoutTemplate?.exercises[exerciseIdx];
      if (template && template.restSeconds > 0) {
        setTimerTargetSeconds(template.restSeconds);
        // Force timer update in widget by briefly blinking or letting it handle the prop sync
        if (autoStartTimer) {
          // Play a tiny confirmation sound and restart the timer widget
          const widget = document.getElementById('rest-timer-widget');
          if (widget) {
            widget.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
          // The Timer component automatically detects the prop changes and updates duration
        }
      }
    }
  };

  // Complete a circuit exercise check in Week 9-12 Day C
  const toggleCircuitExercise = (exIdx: number) => {
    const updated = [...completedCircuitExercises];
    updated[exIdx] = !updated[exIdx];
    setCompletedCircuitExercises(updated);

    if (!activeSession) return;

    // Log the reps for this round/set automatically
    const updatedExercises = [...activeSession.exercises];
    // Set index is current circuitRound - 1
    const setIdx = circuitRound - 1;
    updatedExercises[exIdx].sets[setIdx].completed = updated[exIdx];
    
    setActiveSession({
      ...activeSession,
      exercises: updatedExercises
    });
  };

  // Trigger next round of circuit
  const nextCircuitRound = () => {
    if (circuitRound < 3) {
      setCircuitRound(circuitRound + 1);
      setCompletedCircuitExercises([false, false, false, false]);
      // Start circuit default rest of 2 minutes (120s)
      setTimerTargetSeconds(120);
    }
  };

  // Finish active session and save to log history
  const saveWorkout = () => {
    if (!activeSession) return;

    const finalDuration = Math.max(1, Math.round(sessionDurationSecs / 60));
    const completedSession: WorkoutSession = {
      ...activeSession,
      durationMinutes: finalDuration,
      notes: workoutNotes,
      completed: true,
      date: new Date().toISOString()
    };

    const updatedSessions = [...sessions, completedSession];
    setSessions(updatedSessions);
    localStorage.setItem('workout_sessions', JSON.stringify(updatedSessions));
    
    setActiveSession(null);
    setSessionStartTime(null);
    setSessionDurationSecs(0);
    
    // Advance Day automatically to assist with next session flow
    if (currentDay === 'A') setCurrentDay('B');
    else if (currentDay === 'B') setCurrentDay('C');
    else {
      setCurrentDay('A');
      // If completed Day C, suggest next week
      if (currentWeek < 12) {
        setCurrentWeek(currentWeek + 1);
      }
    }

    // Direct user to Cronologia tab to view their completed work
    setActiveTab('cronologia');
  };

  // Cancel workout
  const cancelWorkout = () => {
    setShowCancelConfirm(true);
  };

  // Delete logged session
  const handleDeleteSession = (id: string) => {
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    localStorage.setItem('workout_sessions', JSON.stringify(updated));
  };

  // Clear all workout data
  const handleClearAllData = () => {
    setSessions([]);
    localStorage.removeItem('workout_sessions');
    setActiveTab('allenamento');
  };

  // Export database to JSON
  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sessions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `workout_history_calisthenics_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import database from JSON
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileReader = new FileReader();
    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          // Rudimentary validation
          const looksValid = parsed.every(item => item && item.id && item.phase && Array.isArray(item.exercises));
          if (looksValid) {
            setSessions(parsed);
            localStorage.setItem('workout_sessions', JSON.stringify(parsed));
            setNotification({
              message: `Backup caricato correttamente! Rilevati ${parsed.length} allenamenti salvati.`,
              type: 'success'
            });
          } else {
            setNotification({
              message: "Il file caricato non sembra contenere una cronologia degli allenamenti valida.",
              type: 'error'
            });
          }
        } else {
          setNotification({
            message: "Struttura JSON non valida.",
            type: 'error'
          });
        }
      } catch (err) {
        setNotification({
          message: "Errore nella lettura del file JSON: " + err,
          type: 'error'
        });
      }
    };
    fileReader.readAsText(files[0]);
  };

  // Generate complete 12-week progressive demo data
  const handleGenerateMockData = () => {
    const mockSessions: WorkoutSession[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 75); // Start ~11 weeks ago

    const baseWeight = 76.5;

    // We generate 20 completed mock sessions distributed over the past weeks
    const sessionDetails = [
      { week: 1, day: 'A' as const, dayName: 'Trazione + Gambe', weightDiff: 0, exReps: [5, 8, 10, 45, 20], exWeights: [0, 12, 12, 0, 0] },
      { week: 1, day: 'B' as const, dayName: 'Spinta', weightDiff: -0.2, exReps: [12, 8, 12, 10, 40], exWeights: [0, 0, 12, 10, 0] },
      { week: 1, day: 'C' as const, dayName: 'Full Body', weightDiff: -0.1, exReps: [6, 10, 10, 12, 12], exWeights: [0, 0, 0, 12, 0] },
      
      { week: 2, day: 'A' as const, dayName: 'Trazione + Gambe', weightDiff: -0.3, exReps: [5, 8, 10, 50, 22], exWeights: [0, 12, 12, 0, 0] },
      { week: 2, day: 'B' as const, dayName: 'Spinta', weightDiff: -0.5, exReps: [13, 9, 12, 10, 40], exWeights: [0, 0, 12, 10, 0] },
      
      { week: 3, day: 'A' as const, dayName: 'Trazione + Gambe', weightDiff: -0.4, exReps: [5, 8, 10, 55, 25], exWeights: [0, 12, 12, 0, 0] },
      { week: 3, day: 'C' as const, dayName: 'Full Body', weightDiff: -0.6, exReps: [7, 10, 10, 12, 12], exWeights: [0, 0, 0, 12, 0] },
      
      { week: 4, day: 'A' as const, dayName: 'Trazione + Gambe', weightDiff: -0.7, exReps: [5, 8, 10, 60, 30], exWeights: [0, 12, 12, 0, 0] },
      { week: 4, day: 'B' as const, dayName: 'Spinta', weightDiff: -0.8, exReps: [15, 10, 12, 10, 40], exWeights: [0, 0, 12, 10, 0] },
      
      // Weeks 5-8: Intensità
      { week: 5, day: 'A' as const, dayName: 'Trazione + Gambe', weightDiff: -1.0, exReps: [6, 8, 10, 45, 22, 45], exWeights: [0, 12, 12, 0, 0, 12] },
      { week: 5, day: 'B' as const, dayName: 'Spinta', weightDiff: -1.2, exReps: [9, 8, 12, 10, 40], exWeights: [5, 0, 12, 10, 0] },
      { week: 5, day: 'C' as const, dayName: 'Full Body', weightDiff: -1.1, exReps: [8, 10, 10, 12, 12], exWeights: [0, 0, 0, 12, 0] },
      
      { week: 6, day: 'A' as const, dayName: 'Trazione + Gambe', weightDiff: -1.3, exReps: [6, 8, 10, 50, 25, 45], exWeights: [2, 12, 12, 0, 0, 12] },
      { week: 6, day: 'B' as const, dayName: 'Spinta', weightDiff: -1.4, exReps: [10, 9, 12, 10, 40], exWeights: [5, 0, 12, 10, 0] },
      
      { week: 7, day: 'A' as const, dayName: 'Trazione + Gambe', weightDiff: -1.6, exReps: [6, 8, 10, 55, 28, 45], exWeights: [4, 12, 12, 0, 0, 12] },
      { week: 7, day: 'C' as const, dayName: 'Full Body', weightDiff: -1.5, exReps: [8, 10, 10, 12, 12], exWeights: [0, 0, 0, 12, 0] },
      
      // Weeks 9-12: Forza
      { week: 9, day: 'A' as const, dayName: 'Forza Trazione + Gambe', weightDiff: -1.8, exReps: [4, 8, 10, 60, 25], exWeights: [6, 12, 14, 0, 0] },
      { week: 9, day: 'B' as const, dayName: 'Forza Spinta', weightDiff: -2.0, exReps: [7, 9, 12, 10, 40], exWeights: [6, 0, 12, 12, 0] },
      { week: 10, day: 'A' as const, dayName: 'Forza Trazione + Gambe', weightDiff: -2.1, exReps: [4, 8, 10, 60, 30], exWeights: [8, 12, 14, 0, 0] },
      { week: 10, day: 'C' as const, dayName: 'Circuito Metabolico', weightDiff: -2.3, exReps: [5, 10, 10, 30], exWeights: [0, 0, 0, 0] }
    ];

    sessionDetails.forEach((detail, sIdx) => {
      const { phase } = getPhaseForWeek(detail.week);
      const workoutDate = new Date(startDate);
      // Increment date by ~3-4 days per workout
      workoutDate.setDate(workoutDate.getDate() + sIdx * 3.5);

      const template = getWorkoutForWeekAndDay(detail.week, detail.day);
      if (!template) return;

      const exerciseLogs: ExerciseLog[] = template.exercises.map((ex, exIdx) => {
        const targetSets = template.isCircuit ? 3 : ex.targetSets;
        const sets: SetLog[] = [];
        
        for (let i = 0; i < targetSets; i++) {
          sets.push({
            reps: detail.exReps[exIdx] || 8,
            weight: detail.exWeights[exIdx] || ex.defaultWeight,
            completed: true
          });
        }

        return {
          exerciseId: ex.id,
          exerciseName: ex.name,
          sets
        };
      });

      mockSessions.push({
        id: `mock_${detail.week}_${detail.day}_${sIdx}`,
        date: workoutDate.toISOString(),
        week: detail.week,
        phase,
        day: detail.day,
        dayName: template.name,
        personalWeight: parseFloat((baseWeight + detail.weightDiff).toFixed(1)),
        exercises: exerciseLogs,
        durationMinutes: 45 + Math.floor(Math.random() * 15),
        notes: `Ottima sessione di allenamento della fase ${phase}! Sentite buone sensazioni e incremento graduale dei carichi.`,
        completed: true
      });
    });

    setSessions(mockSessions);
    localStorage.setItem('workout_sessions', JSON.stringify(mockSessions));
    setNotification({
      message: "Dati demo generati con successo! Controlla ora la tab 'Statistiche' o 'Cronologia'.",
      type: 'success'
    });
    setActiveTab('statistiche');
  };

  // Render Time elapsed (active workout)
  const formatDuration = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col font-sans relative overflow-x-hidden selection:bg-blue-500/30 selection:text-blue-200">
      
      {/* Dynamic Frosted Background Ambient Blurs */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-blue-600/15 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/15 rounded-full blur-[150px]"></div>
        <div className="absolute top-[40%] left-[60%] w-[35%] h-[35%] bg-blue-500/10 rounded-full blur-[130px]"></div>
      </div>

      {/* Dynamic Header */}
      <header className="z-10 border-b border-white/10 bg-white/5 backdrop-blur-md sticky top-0 px-4 py-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl text-white shadow-lg shadow-blue-500/20">
            <Dumbbell className="w-6 h-6 animate-pulse text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display tracking-tight text-slate-100">Muscolino</h1>
            <p className="text-xs text-slate-400">Il tuo diario personale per lo sviluppo di forza e ipertrofia</p>
          </div>
        </div>

        {/* Global Workout Status indicator */}
        {activeSession ? (
          <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/25 rounded-xl px-4 py-2 text-blue-400 font-mono text-sm backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
            <span>SESSIONE ATTIVA • {formatDuration(sessionDurationSecs)}</span>
          </div>
        ) : (
          <div className="text-xs text-slate-400 font-medium bg-white/5 border border-white/10 rounded-xl px-3.5 py-1.5 backdrop-blur-sm">
            Programma strutturato: 3 blocchi da 4 settimane
          </div>
        )}
      </header>

      {/* Main Content & Sidebar Layout */}
      <main className="z-10 flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8">
        
        {/* Left/Sidebar navigation */}
        <div className="w-full lg:w-64 shrink-0 flex flex-row lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('allenamento')}
            className={`flex-1 lg:flex-initial py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center lg:justify-start gap-3 transition-all border ${
              activeTab === 'allenamento'
                ? 'bg-white/10 text-blue-400 border-white/15 backdrop-blur-sm shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-transparent'
            }`}
          >
            <Flame size={18} />
            <span>Allenamento</span>
          </button>

          <button
            onClick={() => setActiveTab('cronologia')}
            className={`flex-1 lg:flex-initial py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center lg:justify-start gap-3 transition-all border ${
              activeTab === 'cronologia'
                ? 'bg-white/10 text-blue-400 border-white/15 backdrop-blur-sm shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-transparent'
            }`}
          >
            <Calendar size={18} />
            <span>Cronologia</span>
          </button>

          <button
            onClick={() => setActiveTab('statistiche')}
            className={`flex-1 lg:flex-initial py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center lg:justify-start gap-3 transition-all border ${
              activeTab === 'statistiche'
                ? 'bg-white/10 text-blue-400 border-white/15 backdrop-blur-sm shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-transparent'
            }`}
          >
            <BarChart2 size={18} />
            <span>Statistiche</span>
          </button>

          <button
            onClick={() => setActiveTab('scheda')}
            className={`flex-1 lg:flex-initial py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center lg:justify-start gap-3 transition-all border ${
              activeTab === 'scheda'
                ? 'bg-white/10 text-blue-400 border-white/15 backdrop-blur-sm shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-transparent'
            }`}
          >
            <BookOpen size={18} />
            <span>Scheda 12 Sett.</span>
          </button>
        </div>

        {/* Tab Panel View */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              
              {/* TAB 1: WORKOUT (ALLENAMENTO) */}
              {activeTab === 'allenamento' && (
                <>
                  {!activeSession ? (
                    /* Setup Panel */
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Workout Selector Card */}
                      <div className="md:col-span-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden">
                        <div className="space-y-1.5">
                          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 font-display">
                            <Sparkles className="text-blue-400 w-5 h-5" />
                            Prepara la tua Sessione
                          </h2>
                          <p className="text-xs text-slate-450">
                            Seleziona la settimana e il giorno per generare l'allenamento specifico della tua scheda.
                          </p>
                        </div>

                        {/* Week Selection Grid */}
                        <div className="space-y-3">
                          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block font-mono">1. Settimana ({currentWeek}/12)</label>
                          <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => {
                              const phaseInfo = getPhaseForWeek(w);
                              let phaseBadgeColor = 'border-white/5 text-slate-400 bg-white/5 hover:bg-white/10';
                              if (w === currentWeek) {
                                if (phaseInfo.phase === 'Costruzione') phaseBadgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold shadow-lg shadow-emerald-500/10';
                                if (phaseInfo.phase === 'Intensità') phaseBadgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold shadow-lg shadow-amber-500/10';
                                if (phaseInfo.phase === 'Forza') phaseBadgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold shadow-lg shadow-rose-500/10';
                              }

                              return (
                                <button
                                  key={w}
                                  onClick={() => setCurrentWeek(w)}
                                  className={`py-2 text-xs font-mono font-bold rounded-lg border transition-all ${
                                    currentWeek === w 
                                      ? phaseBadgeColor 
                                      : 'bg-black/30 border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/20'
                                  }`}
                                >
                                  {w}
                                </button>
                              );
                            })}
                          </div>
                          
                          {/* Selected Week Phase info */}
                          <div className="bg-black/20 border border-white/5 rounded-xl p-3.5 flex items-start gap-3 mt-1 backdrop-blur-sm">
                            <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-200">
                                  Fase: {getPhaseForWeek(currentWeek).phase}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 font-light leading-relaxed">
                                {getPhaseForWeek(currentWeek).description}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Day Selector */}
                        <div className="space-y-3">
                          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block font-mono">2. Giorno d'Allenamento</label>
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { key: 'A' as const, name: currentWeek >= 9 ? 'A - Forza' : 'A - Trazione/Gambe', desc: 'Pull + Core' },
                              { key: 'B' as const, name: currentWeek >= 9 ? 'B - Forza' : 'B - Spinta', desc: 'Push + Core' },
                              { key: 'C' as const, name: currentWeek >= 9 ? 'C - Circuito' : 'C - Full Body', desc: 'Full Body' },
                            ].map((d) => (
                              <button
                                key={d.key}
                                onClick={() => setCurrentDay(d.key)}
                                className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${
                                  currentDay === d.key
                                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-300 ring-1 ring-blue-500/40 shadow-lg shadow-blue-500/5'
                                    : 'bg-black/30 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/5 hover:border-white/10'
                                }`}
                              >
                                <span className="text-sm font-bold font-display">{d.name}</span>
                                <span className="text-[10px] opacity-75">{d.desc}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Start Weight and Action */}
                        <div className="flex flex-col sm:flex-row items-center gap-4 justify-between pt-4 border-t border-white/10">
                          {/* Personal Weight input */}
                          <div className="space-y-2 w-full sm:w-auto">
                            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block font-mono">3. Peso Personale Odierno</label>
                            <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-xl p-1.5 w-full sm:w-44 justify-between">
                              <button
                                onClick={() => setPersonalWeight(prev => Math.max(30, parseFloat((prev - 0.5).toFixed(1))))}
                                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-200"
                              >
                                <Minus size={14} />
                              </button>
                              <div className="flex items-center gap-1 font-mono font-bold text-slate-200 text-sm">
                                <input
                                  type="number"
                                  step="0.1"
                                  value={personalWeight}
                                  onChange={(e) => setPersonalWeight(parseFloat(e.target.value) || 0)}
                                  className="w-16 bg-transparent text-center focus:outline-none focus:ring-0 font-mono text-slate-150"
                                />
                                <span className="text-xs text-slate-400">kg</span>
                              </div>
                              <button
                                onClick={() => setPersonalWeight(prev => parseFloat((prev + 0.5).toFixed(1)))}
                                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-200"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>

                          <button
                            onClick={startWorkout}
                            className="w-full sm:w-auto px-8 py-4 bg-blue-500 hover:bg-blue-400 text-white font-extrabold rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-blue-500/20 hover:scale-[1.01]"
                          >
                            <Play size={18} fill="currentColor" />
                            INIZIA ALLENAMENTO
                          </button>
                        </div>
                      </div>

                      {/* Info & Side widget block */}
                      <div className="space-y-6">
                        {currentWorkoutTemplate && (
                          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 space-y-4">
                            <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wider flex items-center gap-2 font-mono">
                              <Flame size={16} className="text-amber-500" />
                              Riscaldamento (7')
                            </h3>
                            <p className="text-xs text-slate-450">
                              Completa questo riscaldamento per massimizzare la mobilità articolare e prevenire infortuni.
                            </p>
                            <div className="space-y-2.5">
                              {currentWorkoutTemplate.warmup.map((wu, idx) => (
                                <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5"></span>
                                  <span>{wu}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 space-y-3">
                          <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wide font-mono">Cos'è il Peso Personale?</h4>
                          <p className="text-xs text-slate-400 leading-relaxed font-light">
                            Registrare il tuo peso all'inizio di ogni sessione aiuta a tracciare i progressi nel tempo e a rapportare il volume dei tuoi allenamenti a corpo libero al tuo peso corporeo attuale.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Active Workout Session Panel */
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      
                      {/* Main Workout Logging Board */}
                      <div className="lg:col-span-2 space-y-6">
                        {/* Session details banner */}
                        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-400">
                              <span>FASE {activeSession.phase.toUpperCase()}</span>
                              <span>•</span>
                              <span>SETTIMANA {activeSession.week}</span>
                              <span>•</span>
                              <span>GIORNO {activeSession.day}</span>
                            </div>
                            <h2 className="text-xl font-bold font-display text-slate-100">
                              {activeSession.dayName}
                            </h2>
                          </div>

                          <div className="flex gap-4 font-mono text-xs">
                            <div className="bg-black/30 px-3 py-2 rounded-xl border border-white/10 text-slate-300 backdrop-blur-sm">
                              <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wide">Peso Corporeo</span>
                              <span className="font-bold text-slate-100">{activeSession.personalWeight} kg</span>
                            </div>
                            <div className="bg-black/30 px-3 py-2 rounded-xl border border-white/10 text-slate-300 backdrop-blur-sm">
                              <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wide">Durata Attiva</span>
                              <span className="font-bold text-emerald-400">{formatDuration(sessionDurationSecs)}</span>
                            </div>
                          </div>
                        </div>

                        {/* WARMUP CHECKLIST DRAWER (Active) */}
                        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 space-y-3 shadow-xl">
                          <div className="flex justify-between items-center">
                            <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2 font-mono">
                              <Flame size={16} className="text-amber-500" />
                              Completa il Riscaldamento (Consigliato: 7')
                            </h3>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {checkedWarmup.filter(Boolean).length}/{checkedWarmup.length} completati
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                            {currentWorkoutTemplate?.warmup.map((wu, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleWarmupToggle(idx)}
                                className={`p-3 rounded-xl border text-left text-xs flex items-center gap-3 transition-all ${
                                  checkedWarmup[idx]
                                    ? 'bg-amber-500/10 border-amber-500/30 text-slate-200 backdrop-blur-sm'
                                    : 'bg-black/30 border-white/5 text-slate-400 hover:border-white/10'
                                }`}
                              >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                  checkedWarmup[idx] ? 'bg-amber-500 border-amber-500 text-slate-950' : 'border-slate-700'
                                }`}>
                                  {checkedWarmup[idx] && <Check size={12} strokeWidth={3} />}
                                </div>
                                <span className={checkedWarmup[idx] ? 'line-through text-slate-500 font-light' : ''}>
                                  {wu}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* CIRCUIT LOGGING ENGINE (SPECIAL Weeks 9-12 Day C) */}
                        {currentWorkoutTemplate?.isCircuit ? (
                          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 space-y-6 shadow-xl">
                            <div className="flex justify-between items-center">
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block font-mono">Modalità Circuito</span>
                                <h3 className="font-bold text-lg text-slate-200 font-display">Giro {circuitRound} di 3</h3>
                              </div>
                              <div className="px-3 py-1 bg-amber-500/15 text-amber-300 text-xs font-mono font-bold rounded-full border border-amber-500/25">
                                Recupero 2' tra i giri
                              </div>
                            </div>

                            {/* Circuit steps checklist */}
                            <div className="space-y-3">
                              {currentWorkoutTemplate.exercises.map((ex, exIdx) => (
                                <div
                                  key={exIdx}
                                  className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                                    completedCircuitExercises[exIdx]
                                      ? 'bg-blue-500/10 border-blue-500/30 ring-1 ring-blue-500/40 shadow-lg shadow-blue-500/5'
                                      : 'bg-black/30 border-white/5'
                                  }`}
                                >
                                  <div className="space-y-1 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-mono font-bold text-slate-450">Step {exIdx + 1}</span>
                                      <h4 className="font-bold text-sm text-slate-200 font-display">{ex.name}</h4>
                                    </div>
                                    <p className="text-xs text-slate-400 font-light leading-relaxed">{ex.notes}</p>
                                  </div>

                                  <div className="flex items-center gap-4">
                                    <div className="text-right">
                                      <span className="text-xs font-mono text-slate-400">Target</span>
                                      <div className="text-sm font-bold font-mono text-blue-300">{ex.targetReps} rip</div>
                                    </div>

                                    {/* Action check button */}
                                    <button
                                      onClick={() => toggleCircuitExercise(exIdx)}
                                      className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition ${
                                        completedCircuitExercises[exIdx]
                                          ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-250 hover:bg-white/10'
                                      }`}
                                    >
                                      {completedCircuitExercises[exIdx] ? <Check size={18} strokeWidth={3} /> : <span className="text-xs font-mono px-1">Fatto</span>}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Round Transition button */}
                            <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                              <span className="text-xs text-slate-450">
                                Completa tutti i 4 esercizi per sbloccare il recupero.
                              </span>

                              {completedCircuitExercises.every(Boolean) ? (
                                circuitRound < 3 ? (
                                  <button
                                    onClick={nextCircuitRound}
                                    className="px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition shadow-lg shadow-blue-500/25"
                                  >
                                    Completa Giro {circuitRound} & Avvia Recupero
                                    <ChevronRight size={14} />
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                                    <CheckCircle size={16} />
                                    Tutti i giri completati!
                                  </div>
                                )
                              ) : null}
                            </div>
                          </div>
                        ) : (
                          /* STANDARD LOGGING ENGINE (Weeks 1-12) */
                          <div className="space-y-6">
                            {activeSession.exercises.map((ex, exIdx) => {
                              const template = currentWorkoutTemplate?.exercises[exIdx];
                              
                              return (
                                <div
                                  key={ex.exerciseId}
                                  className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 md:p-6 space-y-4 shadow-xl"
                                >
                                  {/* Exercise title & details */}
                                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/10 pb-3">
                                    <div>
                                      <h3 className="font-bold text-slate-100 text-base font-display">{ex.exerciseName}</h3>
                                      <p className="text-xs text-slate-400 font-light leading-relaxed mt-0.5">{template?.notes}</p>
                                    </div>
                                    <div className="flex gap-2 font-mono text-[10px] shrink-0 mt-1 sm:mt-0">
                                      <span className="px-2 py-0.5 bg-blue-500/15 text-blue-300 border border-blue-500/20 rounded">
                                        Target: {template?.targetSets}x{template?.targetReps}
                                      </span>
                                      <span className="px-2 py-0.5 bg-white/5 text-slate-350 border border-white/10 rounded">
                                        Recupero: {template?.restSeconds}s
                                      </span>
                                    </div>
                                  </div>

                                  {/* Sets list */}
                                  <div className="space-y-3">
                                    {ex.sets.map((set, setIdx) => (
                                      <div
                                        key={setIdx}
                                        className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                                          set.completed
                                            ? 'bg-emerald-500/10 border-emerald-500/30'
                                            : 'bg-black/20 border-white/5'
                                        }`}
                                      >
                                        <div className="flex items-center gap-3">
                                          <span className={`w-7 h-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center border ${
                                            set.completed
                                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-450'
                                              : 'bg-white/5 border-white/10 text-slate-400'
                                          }`}>
                                            {setIdx + 1}
                                          </span>
                                          <span className="text-xs font-semibold text-slate-350">Serie {setIdx + 1}</span>
                                        </div>

                                        <div className="flex items-center gap-6 justify-between sm:justify-end">
                                          {/* Reps Controller */}
                                          <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wide block font-mono">Ripetizioni</span>
                                            <div className="flex items-center gap-1.5 bg-black/30 border border-white/10 rounded-lg p-1">
                                              <button
                                                onClick={() => updateSet(exIdx, setIdx, { reps: Math.max(0, set.reps - 1) })}
                                                className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-slate-200"
                                              >
                                                <Minus size={12} />
                                              </button>
                                              <input
                                                type="number"
                                                value={set.reps}
                                                onChange={(e) => updateSet(exIdx, setIdx, { reps: parseInt(e.target.value, 10) || 0 })}
                                                className="w-10 text-center bg-transparent focus:outline-none font-mono text-xs font-bold text-slate-200"
                                              />
                                              <button
                                                onClick={() => updateSet(exIdx, setIdx, { reps: set.reps + 1 })}
                                                className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-slate-200"
                                              >
                                                <Plus size={12} />
                                              </button>
                                            </div>
                                          </div>

                                          {/* Weight Controller */}
                                          <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wide block font-mono">Zavorra (kg)</span>
                                            <div className="flex items-center gap-1.5 bg-black/30 border border-white/10 rounded-lg p-1">
                                              <button
                                                onClick={() => updateSet(exIdx, setIdx, { weight: Math.max(0, parseFloat((set.weight - 1).toFixed(1))) })}
                                                className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-slate-200"
                                              >
                                                <Minus size={12} />
                                              </button>
                                              <input
                                                type="number"
                                                step="0.5"
                                                value={set.weight}
                                                onChange={(e) => updateSet(exIdx, setIdx, { weight: parseFloat(e.target.value) || 0 })}
                                                className="w-12 text-center bg-transparent focus:outline-none font-mono text-xs font-bold text-slate-200"
                                              />
                                              <button
                                                onClick={() => updateSet(exIdx, setIdx, { weight: parseFloat((set.weight + 1).toFixed(1)) })}
                                                className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-slate-200"
                                              >
                                                <Plus size={12} />
                                              </button>
                                            </div>
                                          </div>

                                          {/* Set Completion button */}
                                          <button
                                            onClick={() => updateSet(exIdx, setIdx, { completed: !set.completed })}
                                            className={`p-2.5 rounded-lg border font-bold flex items-center justify-center transition ${
                                              set.completed
                                                ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-md shadow-emerald-500/10'
                                                : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
                                            }`}
                                          >
                                            <Check size={14} strokeWidth={3} />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Session Notes & Action Section */}
                        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
                          <div className="space-y-1.5">
                            <h3 className="font-bold text-sm text-slate-200 uppercase tracking-wide font-mono">Note della sessione</h3>
                            <p className="text-xs text-slate-450">Scrivi com'è andato l'allenamento (es. sensazioni, facilità delle rep, meteo, dolori)</p>
                          </div>
                          <textarea
                            value={workoutNotes}
                            onChange={(e) => setWorkoutNotes(e.target.value)}
                            placeholder="Es: Ottime trazioni, la presa era solidissima oggi. Sento di poter aumentare la zavorra la prossima volta."
                            rows={3}
                            className="w-full bg-black/30 border border-white/10 focus:border-blue-500 focus:outline-none p-3.5 rounded-xl text-xs text-slate-200 placeholder-slate-500 transition-all resize-none"
                          />

                          <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-between">
                            <button
                                onClick={cancelWorkout}
                                className="px-4 py-2.5 bg-black/30 hover:bg-white/5 text-rose-400 border border-white/10 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                            >
                              <X size={14} />
                              Annulla Allenamento
                            </button>

                            <button
                              onClick={saveWorkout}
                              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 uppercase tracking-wider"
                            >
                              <Save size={14} />
                              Termina & Salva Allenamento
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Right sidebar - Rest Timer & Active Widgets */}
                      <div className="space-y-6">
                        {/* Auto Timer settings */}
                        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
                          <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wide font-mono">Preferenze Timer</h4>
                          
                          <label className="flex items-center gap-3 cursor-pointer group">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={autoStartTimer}
                                onChange={(e) => setAutoStartTimer(e.target.checked)}
                                className="sr-only"
                              />
                              <div className={`w-9 h-5 rounded-full transition-colors ${autoStartTimer ? 'bg-blue-500' : 'bg-white/10'}`}></div>
                              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-slate-100 transition-transform ${autoStartTimer ? 'translate-x-4' : 'translate-x-0'}`}></div>
                            </div>
                            <span className="text-xs text-slate-300 group-hover:text-slate-100 transition-colors">
                              Auto-start al completamento
                            </span>
                          </label>
                          
                          <p className="text-[10px] text-slate-450 leading-relaxed font-light">
                            Quando abilitato, spuntare una serie avvierà automaticamente il conto alla rovescia con il tempo consigliato per l'esercizio.
                          </p>
                        </div>

                        {/* Interactive Rest Timer */}
                        <Timer
                          initialSeconds={timerTargetSeconds}
                          autoStartOnSet={autoStartTimer}
                        />

                        {/* Program overview hint */}
                        <div className="bg-blue-500/10 border border-blue-500/25 rounded-2xl p-5 space-y-2 backdrop-blur-sm">
                          <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5 text-blue-400 uppercase tracking-wide font-mono">
                            <Info size={14} />
                            Fase {activeSession.phase}
                          </h4>
                          <p className="text-xs text-slate-400 leading-relaxed font-light">
                            {getPhaseForWeek(activeSession.week).description}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* TAB 2: HISTORY (CRONOLOGIA) */}
              {activeTab === 'cronologia' && (
                <History
                  sessions={sessions}
                  onDeleteSession={handleDeleteSession}
                  onExportData={handleExportData}
                  onImportData={handleImportData}
                />
              )}

              {/* TAB 3: STATS (STATISTICHE) */}
              {activeTab === 'statistiche' && (
                <Stats
                  sessions={sessions}
                  onGenerateMockData={handleGenerateMockData}
                  onClearData={handleClearAllData}
                />
              )}

              {/* TAB 4: EDUCATIONAL (SCHEDA DETTAGLIATA) */}
              {activeTab === 'scheda' && (
                <div className="space-y-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 shadow-xl">
                  <div className="space-y-2 border-b border-white/10 pb-5">
                    <h2 className="text-2xl font-bold font-display text-slate-100">Scheda Calisthenics 12 Settimane</h2>
                    <p className="text-sm text-slate-450 font-light leading-relaxed">
                      Consulta i dettagli teorici del programma, gli incrementi di intensità previsti e la gestione dei sovraccarichi.
                    </p>
                  </div>

                  <div className="space-y-8">
                    {WORKOUT_PROGRAM.map((p, idx) => (
                      <div key={idx} className="space-y-4">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 font-mono font-bold flex items-center justify-center text-sm">
                            {idx + 1}
                          </span>
                          <div>
                            <h3 className="font-bold text-lg text-slate-200 font-display">
                              Settimane {p.weeks[0]}-{p.weeks[p.weeks.length - 1]} – {p.phase}
                            </h3>
                            <p className="text-xs text-slate-400 italic font-light">{p.description}</p>
                          </div>
                        </div>

                        {/* Days overview */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-11">
                          {p.days.map((d, dIdx) => (
                            <div key={dIdx} className="bg-black/20 border border-white/5 rounded-xl p-4 space-y-3">
                              <h4 className="font-bold text-blue-400 text-sm border-b border-white/5 pb-1.5 flex items-center justify-between font-display">
                                <span>Giorno {d.day}</span>
                                <span className="text-[10px] text-slate-455 font-mono capitalize">{d.name}</span>
                              </h4>
                              
                              <div className="space-y-2">
                                {d.exercises.map((ex, exIdx) => (
                                  <div key={exIdx} className="flex justify-between items-start text-xs text-slate-300">
                                    <span className="font-light truncate max-w-[130px]">{ex.name}</span>
                                    <span className="font-mono font-bold text-blue-300 text-[10px]">
                                      {ex.targetSets}x{ex.targetReps}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Theoretical Advice & Guidelines */}
                  <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
                    <h3 className="font-bold text-base text-slate-200 flex items-center gap-2 font-display">
                      <HelpCircle size={18} className="text-emerald-400" />
                      Regole di Progressione e Consigli
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-400 leading-relaxed font-light">
                      <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-2 backdrop-blur-sm">
                        <h4 className="font-bold text-slate-200">Progressione dei Push-up (Fase 1)</h4>
                        <p className="text-slate-450">
                          Quando riesci a fare agilmente 4 serie da 15 ripetizioni di push-up a terra a corpo libero, inserisci un carico di <strong>4-6 kg</strong> all'interno di uno zaino e mantienilo obbligatoriamente per le settimane successive.
                        </p>
                      </div>

                      <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-2 backdrop-blur-sm">
                        <h4 className="font-bold text-slate-200">Trazioni (Fase 2 - Settimane 5-8)</h4>
                        <p className="text-slate-450">
                          Passa a uno schema 6 serie da 4 ripetizioni o 5 serie da 6 ripetizioni. Quando sarai in grado di completare agilmente 5 serie da 8 ripetizioni (5x8), aggiungi un piccolo sovraccarico (zaino o cintura).
                        </p>
                      </div>

                      <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-2 backdrop-blur-sm">
                        <h4 className="font-bold text-slate-200">Tempo Sotto Tensione</h4>
                        <p className="text-slate-450">
                          I Bulgarian Split Squat e i Goblet Squat (nella fase 2) prevedono una <strong>discesa controllata in 3 secondi</strong> (fase eccentrica). Non cadere col peso, mantieni il muscolo attivo per tutta la discesa.
                        </p>
                      </div>

                      <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-2 backdrop-blur-sm">
                        <h4 className="font-bold text-slate-200">Recuperi Consigliati</h4>
                        <p className="text-slate-450">
                          Mantieni <strong>90-120 secondi</strong> di recupero per gli esercizi di trazione pura (Trazioni), e <strong>60-75 secondi</strong> per gli altri esercizi. I circuiti (settimane 9-12 giorno C) prevedono invece <strong>2 minuti</strong> completi di riposo solo dopo avre completato un intero giro di 4 esercizi.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Elegant footer */}
      <footer className="border-t border-white/10 bg-white/5 py-6 text-center text-xs text-slate-500 font-mono backdrop-blur-md">
        Muscolino • Creato con React, Tailwind CSS e Lucide Icons
      </footer>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {showCancelConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#1e293b] border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-6 shadow-2xl text-left"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <AlertCircle size={24} />
                <h3 className="text-base font-bold font-display text-slate-100">Annulla Allenamento</h3>
              </div>
              
              <p className="text-xs text-slate-300 leading-relaxed font-light">
                Sei sicuro di voler annullare la sessione in corso? Tutti i dati registrati oggi andranno persi per sempre.
              </p>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-semibold border border-white/5 transition"
                >
                  Continua Allenamento
                </button>
                <button
                  onClick={() => {
                    setShowCancelConfirm(false);
                    setActiveSession(null);
                    setSessionStartTime(null);
                    setSessionDurationSecs(0);
                  }}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-rose-500/20 uppercase tracking-wider font-mono"
                >
                  Sì, Annulla
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-4 left-1/2 z-50 p-4 rounded-xl border shadow-2xl backdrop-blur-md max-w-sm w-[calc(100%-2rem)] sm:w-full flex items-start gap-3 text-left"
            style={{
              backgroundColor: notification.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : notification.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
              borderColor: notification.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : notification.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)',
              color: notification.type === 'error' ? '#fca5a5' : notification.type === 'success' ? '#6ee7b7' : '#93c5fd',
            }}
          >
            {notification.type === 'error' ? (
              <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-400" />
            ) : (
              <CheckCircle size={18} className="shrink-0 mt-0.5 text-emerald-400" />
            )}
            <div className="space-y-0.5">
              <span className="text-xs font-bold font-mono uppercase tracking-wide">
                {notification.type === 'error' ? 'Attenzione' : notification.type === 'success' ? 'Successo' : 'Info'}
              </span>
              <p className="text-xs opacity-90 leading-relaxed font-light text-slate-100">{notification.message}</p>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="ml-auto p-1 hover:bg-white/10 rounded text-current opacity-70 hover:opacity-100 transition"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
