/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Dumbbell, Calendar, BarChart2, BookOpen, Clock, Weight, Flame, 
  Play, Square, Check, RotateCcw, Plus, Minus, Info, Settings,
  CheckCircle, ChevronRight, AlertCircle, Save, X, Sparkles, HelpCircle,
  Trash2, Edit3, Undo
} from 'lucide-react';

import { WorkoutSession, DayTemplate, ExerciseTemplate, ExerciseLog, SetLog, Phase, WeekTemplate } from './types';
import { WORKOUT_PROGRAM } from './workoutProgram';
import Timer, { playTimerBeep } from './components/Timer';
import Stats from './components/Stats';
import History from './components/History';

const PREDEFINED_EXERCISES = [
  'Trazioni al mento',
  'Trazioni alla sbarra',
  'Trazioni zavorrate',
  'Scapular Pull-up',
  'Chin-up',
  'Pull-up',
  'Rematore con Manubrio',
  'Australian Pull-up',
  'Push-up',
  'Push-up Zavorrati',
  'Push-up Piedi Rialzati',
  'Pike Push-up',
  'Dip alle parallele',
  'Squat a corpo libero',
  'Bulgarian Split Squat',
  'Goblet Squat',
  'Affondi alternati',
  'Romanian Deadlift',
  'Stacco da terra (Deadlift)',
  'Plank',
  'Plank Monobraccio',
  'Side Plank',
  'Hollow Hold',
  'Hanging Knee Raise',
  'Hanging Leg Raise',
  'Curl con Manubrio',
  'Hammer Curl',
  'Estensioni Tricipiti',
  'Alzate Laterali',
  'Altro (Personalizzato)...'
];

export default function App() {
  // Navigation & Persistent Preferences State
  const [activeTab, setActiveTab] = useState<'allenamento' | 'cronologia' | 'statistiche' | 'scheda'>('allenamento');
  const [currentWeek, setCurrentWeek] = useState<number>(1);
  const [currentDay, setCurrentDay] = useState<'A' | 'B' | 'C'>('A');
  const [personalWeight, setPersonalWeight] = useState<number>(75);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);

  // Editable Workout Program State
  const [workoutProgram, setWorkoutProgram] = useState<WeekTemplate[]>(() => {
    const saved = localStorage.getItem('custom_workout_program');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure all exercises have difficulty initialized to 1 if missing
          return parsed.map((week: any) => ({
            ...week,
            days: week.days.map((day: any) => ({
              ...day,
              exercises: day.exercises.map((ex: any) => ({
                ...ex,
                difficulty: ex.difficulty !== undefined ? ex.difficulty : 1
              }))
            }))
          }));
        }
      } catch (err) {
        console.error("Errore nel caricamento del programma personalizzato:", err);
      }
    }
    // Deep copy and map WORKOUT_PROGRAM to ensure difficulty is initialized to 1
    return JSON.parse(JSON.stringify(WORKOUT_PROGRAM)).map((week: any) => ({
      ...week,
      days: week.days.map((day: any) => ({
        ...day,
        exercises: day.exercises.map((ex: any) => ({
          ...ex,
          difficulty: ex.difficulty !== undefined ? ex.difficulty : 1
        }))
      }))
    }));
  });
  const [isEditingProgram, setIsEditingProgram] = useState<boolean>(false);
  const [tempWorkoutProgram, setTempWorkoutProgram] = useState<WeekTemplate[]>([]);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Helper to get Phase and Description for a week from the active program state
  const getPhaseInfo = (week: number) => {
    const template = workoutProgram.find(p => p.weeks.includes(week));
    if (!template) return { phase: 'Costruzione' as Phase, description: '' };
    return { phase: template.phase, description: template.description };
  };

  // Add Exercise to temporary program
  const handleAddExercise = (blockIdx: number, dIdx: number) => {
    const updated = [...tempWorkoutProgram];
    const newExId = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    updated[blockIdx].days[dIdx].exercises.push({
      id: newExId,
      name: 'Trazioni al mento',
      targetSets: 4,
      targetReps: '8',
      defaultWeight: 0,
      notes: '',
      restSeconds: 60,
      isIsometric: false,
      difficulty: 1
    });
    setTempWorkoutProgram(updated);
  };

  // Remove Exercise from temporary program
  const handleRemoveExercise = (blockIdx: number, dIdx: number, exIdx: number) => {
    const updated = [...tempWorkoutProgram];
    updated[blockIdx].days[dIdx].exercises.splice(exIdx, 1);
    setTempWorkoutProgram(updated);
  };

  // Update Exercise fields in temporary program
  const handleUpdateExercise = (blockIdx: number, dIdx: number, exIdx: number, fields: Partial<ExerciseTemplate>) => {
    const updated = [...tempWorkoutProgram];
    updated[blockIdx].days[dIdx].exercises[exIdx] = {
      ...updated[blockIdx].days[dIdx].exercises[exIdx],
      ...fields
    };
    setTempWorkoutProgram(updated);
  };

  // Enable Edit Mode
  const handleStartEditingProgram = () => {
    setTempWorkoutProgram(JSON.parse(JSON.stringify(workoutProgram)));
    setIsEditingProgram(true);
  };

  // Save Program edits
  const handleSaveProgram = () => {
    setWorkoutProgram(tempWorkoutProgram);
    localStorage.setItem('custom_workout_program', JSON.stringify(tempWorkoutProgram));
    setIsEditingProgram(false);
    setNotification({
      message: 'Programma d\'allenamento salvato correttamente!',
      type: 'success'
    });
  };

  // Cancel Program Editing
  const handleCancelProgramEdit = () => {
    setIsEditingProgram(false);
  };

  // Reset Program to default templates
  const handleResetProgramToDefault = () => {
    setWorkoutProgram(WORKOUT_PROGRAM);
    localStorage.removeItem('custom_workout_program');
    setIsEditingProgram(false);
    setShowResetConfirm(false);
    setNotification({
      message: 'Programma d\'allenamento ripristinato ai valori predefiniti.',
      type: 'info'
    });
  };
  
  // Active Workout Session State
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionDurationSecs, setSessionDurationSecs] = useState<number>(0);
  const [timerTargetSeconds, setTimerTargetSeconds] = useState<number>(60);
  const [autoStartTimer, setAutoStartTimer] = useState<boolean>(true);
  const [timerTrigger, setTimerTrigger] = useState<number>(0);
  const [workoutNotes, setWorkoutNotes] = useState<string>('');
  
  // Warm-up Checklist
  const [checkedWarmup, setCheckedWarmup] = useState<boolean[]>([]);

  // Sticky navigation and scroll direction behavior
  const [isVisibleTabs, setIsVisibleTabs] = useState<boolean>(true);
  const lastScrollY = useRef<number>(0);
  const headerRef = useRef<HTMLElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState<number>(76);

  useEffect(() => {
    if (headerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          setHeaderHeight(entry.target.clientHeight);
        }
      });
      resizeObserver.observe(headerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  // Exercise card collapse tracking (by exerciseId)
  const [manuallyExpanded, setManuallyExpanded] = useState<Record<string, boolean>>({});
  const prevCompletedRef = useRef<boolean[]>([]);
  
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

  // Load data from LocalStorage on mount & sync with API
  useEffect(() => {
    // 1. Instant load from localStorage
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

    // 2. Fetch from Server API
    fetch('/api/workout-data')
      .then(res => res.json())
      .then(data => {
        if (data) {
          if (data.program) {
            setWorkoutProgram(data.program);
            localStorage.setItem('custom_workout_program', JSON.stringify(data.program));
          }
          if (data.sessions) {
            setSessions(data.sessions);
            localStorage.setItem('workout_sessions', JSON.stringify(data.sessions));
          }
          if (data.preferences) {
            if (data.preferences.currentWeek) {
              setCurrentWeek(data.preferences.currentWeek);
              localStorage.setItem('user_current_week', data.preferences.currentWeek.toString());
            }
            if (data.preferences.currentDay) {
              setCurrentDay(data.preferences.currentDay);
              localStorage.setItem('user_current_day', data.preferences.currentDay);
            }
            if (data.preferences.personalWeight) {
              setPersonalWeight(data.preferences.personalWeight);
              localStorage.setItem('user_personal_weight', data.preferences.personalWeight.toString());
            }
          }
        }
        setIsLoaded(true);
      })
      .catch(err => {
        console.warn("API non raggiungibile, uso localStorage:", err);
        setIsLoaded(true);
      });
  }, []);

  // Update preferences and sync to LocalStorage & Server API
  useEffect(() => {
    localStorage.setItem('user_current_week', currentWeek.toString());
    if (!isLoaded) return;
    const preferences = { currentWeek, currentDay, personalWeight };
    fetch('/api/workout-preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences })
    }).catch(err => console.error("Errore nel salvataggio della settimana via API:", err));
  }, [currentWeek, isLoaded]);

  useEffect(() => {
    localStorage.setItem('user_current_day', currentDay);
    if (!isLoaded) return;
    const preferences = { currentWeek, currentDay, personalWeight };
    fetch('/api/workout-preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences })
    }).catch(err => console.error("Errore nel salvataggio del giorno via API:", err));
  }, [currentDay, isLoaded]);

  useEffect(() => {
    localStorage.setItem('user_personal_weight', personalWeight.toString());
    if (!isLoaded) return;
    const preferences = { currentWeek, currentDay, personalWeight };
    fetch('/api/workout-preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences })
    }).catch(err => console.error("Errore nel salvataggio del peso via API:", err));
  }, [personalWeight, isLoaded]);

  // Sync workoutProgram to API when edited
  useEffect(() => {
    if (!isLoaded) return;
    fetch('/api/workout-program', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ program: workoutProgram })
    }).catch(err => console.error("Errore nel salvataggio del programma via API:", err));
  }, [workoutProgram, isLoaded]);

  // Sync sessions to API when edited
  useEffect(() => {
    if (!isLoaded) return;
    fetch('/api/workout-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessions })
    }).catch(err => console.error("Errore nel salvataggio delle sessioni via API:", err));
  }, [sessions, isLoaded]);

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

  // Listen for scroll events to hide/show navigation tabs
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // If close to the top, always show tabs
      if (currentScrollY < 80) {
        setIsVisibleTabs(true);
        return;
      }
      
      // Minimum change threshold to prevent jitter on tiny scroll adjustments
      if (Math.abs(currentScrollY - lastScrollY.current) < 8) {
        return;
      }
      
      if (currentScrollY > lastScrollY.current) {
        // Scrolling down -> hide tabs
        setIsVisibleTabs(false);
      } else {
        // Scrolling up -> show tabs
        setIsVisibleTabs(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Monitor exercise completion to automatically collapse and scroll to next card
  useEffect(() => {
    if (!activeSession) {
      prevCompletedRef.current = [];
      return;
    }

    const currentCompleted = activeSession.exercises.map(
      ex => ex.sets.length > 0 && ex.sets.every(set => set.completed)
    );

    // Check if an exercise has JUST transitioned to fully completed
    const justCompletedIdx = currentCompleted.findIndex(
      (completed, idx) => completed && !prevCompletedRef.current[idx]
    );

    if (justCompletedIdx !== -1) {
      const nextIdx = justCompletedIdx + 1;
      if (nextIdx < activeSession.exercises.length) {
        // Smoothly scroll the next exercise card into the center of the viewport
        setTimeout(() => {
          const nextCard = document.getElementById(`exercise-card-${nextIdx}`);
          if (nextCard) {
            nextCard.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
          }
        }, 300); // 300ms delay to allow collapse animation/layout to settle
      } else {
        // Scroll to the "end workout / notes" section if this was the last exercise
        setTimeout(() => {
          const notesSection = document.getElementById('session-notes-section');
          if (notesSection) {
            notesSection.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
          }
        }, 300);
      }
    }

    prevCompletedRef.current = currentCompleted;
  }, [activeSession?.exercises]);

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
  const currentWorkoutTemplate = workoutProgram
    .find(p => p.weeks.includes(currentWeek))
    ?.days.find(d => d.day === currentDay) || null;
  useEffect(() => {
    if (currentWorkoutTemplate) {
      setCheckedWarmup(new Array(currentWorkoutTemplate.warmup.length).fill(false));
    }
  }, [currentWeek, currentDay, workoutProgram]);

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

    const { phase } = getPhaseInfo(currentWeek);

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
          setTimerTrigger(Date.now());
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
      if (autoStartTimer) {
        setTimerTrigger(Date.now());
      }
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
      const { phase } = getPhaseInfo(detail.week);
      const workoutDate = new Date(startDate);
      // Increment date by ~3-4 days per workout
      workoutDate.setDate(workoutDate.getDate() + sIdx * 3.5);

      const template = workoutProgram
        .find(p => p.weeks.includes(detail.week))
        ?.days.find(d => d.day === detail.day);
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
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col font-sans relative overflow-x-clip selection:bg-blue-500/30 selection:text-blue-200">
      
      {/* Dynamic Frosted Background Ambient Blurs */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-blue-600/15 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/15 rounded-full blur-[150px]"></div>
        <div className="absolute top-[40%] left-[60%] w-[35%] h-[35%] bg-blue-500/10 rounded-full blur-[130px]"></div>
      </div>

      {/* Sticky Header */}
      <header 
        ref={headerRef}
        className="sticky top-0 z-50 bg-[#0f172a]/95 backdrop-blur-md border-b border-white/10 w-full px-4 py-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-1 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center overflow-hidden w-11 h-11">
            <img 
              src="/Icon.png" 
              alt="Muscolino Logo" 
              className="w-9 h-9 object-cover rounded-lg" 
              referrerPolicy="no-referrer"
            />
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

      {/* Smart Sticky Tab Navigation (horizontal) */}
      <div 
        style={{ 
          top: `${headerHeight}px`,
          transform: isVisibleTabs ? 'translateY(0)' : 'translateY(-100%)',
          opacity: isVisibleTabs ? 1 : 0,
          pointerEvents: isVisibleTabs ? 'auto' : 'none',
        }}
        className="sticky z-40 bg-[#0f172a]/95 backdrop-blur-md border-b border-white/10 w-full transition-all duration-300 ease-in-out py-2.5 shadow-md shadow-black/10 flex flex-col"
      >
        <div className="w-full max-w-3xl mx-auto px-4 md:px-8 flex gap-2 overflow-x-auto scrollbar-none justify-start sm:justify-center">
          <button
            onClick={() => setActiveTab('allenamento')}
            className={`flex-1 py-2 px-3 sm:py-2.5 sm:px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all border shrink-0 ${
              activeTab === 'allenamento'
                ? 'bg-white/10 text-blue-400 border-white/15 backdrop-blur-sm shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-transparent'
            }`}
          >
            <Flame size={16} />
            <span>Allenamento</span>
          </button>

          <button
            onClick={() => setActiveTab('cronologia')}
            className={`flex-1 py-2 px-3 sm:py-2.5 sm:px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all border shrink-0 ${
              activeTab === 'cronologia'
                ? 'bg-white/10 text-blue-400 border-white/15 backdrop-blur-sm shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-transparent'
            }`}
          >
            <Calendar size={16} />
            <span>Cronologia</span>
          </button>

          <button
            onClick={() => setActiveTab('statistiche')}
            className={`flex-1 py-2 px-3 sm:py-2.5 sm:px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all border shrink-0 ${
              activeTab === 'statistiche'
                ? 'bg-white/10 text-blue-400 border-white/15 backdrop-blur-sm shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-transparent'
            }`}
          >
            <BarChart2 size={16} />
            <span>Statistiche</span>
          </button>

          <button
            onClick={() => setActiveTab('scheda')}
            className={`flex-1 py-2 px-3 sm:py-2.5 sm:px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all border shrink-0 ${
              activeTab === 'scheda'
                ? 'bg-white/10 text-blue-400 border-white/15 backdrop-blur-sm shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-transparent'
            }`}
          >
            <BookOpen size={16} />
            <span>Scheda 12 Sett.</span>
          </button>
        </div>
      </div>

      {/* Main Content Layout (Always Single Column/Mono-colonna) */}
      <main className="z-10 flex-1 max-w-3xl w-full mx-auto p-4 md:p-8 flex flex-col gap-8">
        {/* Tab Panel View */}
        <div className="w-full min-w-0">
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
                    <div className="max-w-3xl mx-auto w-full">
                      
                      {/* Workout Selector Card */}
                      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden">
                        <div className="space-y-1.5">
                          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 font-display">
                            <Sparkles className="text-blue-400 w-5 h-5" />
                            Prepara la tua Sessione
                          </h2>
                          <p className="text-xs text-slate-450">
                            Seleziona la settimana e il giorno per generare l'allenamento specifico della tua scheda.
                          </p>
                        </div>

                        {/* Block & Week Selection */}
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block font-mono">
                              1. Seleziona Blocco Settimane
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {[
                                { label: 'Settimane 1-4', range: [1, 2, 3, 4], phase: 'Costruzione', color: 'emerald' },
                                { label: 'Settimane 5-8', range: [5, 6, 7, 8], phase: 'Intensità', color: 'amber' },
                                { label: 'Settimane 9-12', range: [9, 10, 11, 12], phase: 'Forza', color: 'rose' }
                              ].map((block) => {
                                const isBlockActive = block.range.includes(currentWeek);
                                let activeStyles = '';
                                if (isBlockActive) {
                                  if (block.color === 'emerald') activeStyles = 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-lg shadow-emerald-500/10';
                                  if (block.color === 'amber') activeStyles = 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-lg shadow-amber-500/10';
                                  if (block.color === 'rose') activeStyles = 'bg-rose-500/15 border-rose-500/40 text-rose-300 shadow-lg shadow-rose-500/10';
                                }

                                return (
                                  <button
                                    key={block.label}
                                    type="button"
                                    onClick={() => {
                                      if (!block.range.includes(currentWeek)) {
                                        setCurrentWeek(block.range[0]);
                                      }
                                    }}
                                    className={`py-2.5 px-4 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
                                      isBlockActive
                                        ? `${activeStyles} font-bold`
                                        : 'bg-black/20 border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10 hover:bg-white/5'
                                    }`}
                                  >
                                    <span className="font-display text-sm">{block.label}</span>
                                    <span className="text-[9px] font-mono uppercase tracking-wider opacity-80">{block.phase}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Specific Week Selector within the block */}
                          <div className="space-y-2 bg-black/15 border border-white/5 rounded-xl p-3.5 backdrop-blur-sm">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono mb-1.5">
                              Settimana Specifica nel Blocco:
                            </span>
                            <div className="flex gap-2">
                              {(() => {
                                // Find current block range
                                const currentBlock = [
                                  [1, 2, 3, 4],
                                  [5, 6, 7, 8],
                                  [9, 10, 11, 12]
                                ].find(range => range.includes(currentWeek)) || [1, 2, 3, 4];

                                return currentBlock.map((w) => {
                                  const isSelected = w === currentWeek;
                                  return (
                                    <button
                                      key={w}
                                      type="button"
                                      onClick={() => setCurrentWeek(w)}
                                      className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                                        isSelected
                                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/45 shadow-sm'
                                          : 'bg-black/35 border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/15'
                                      }`}
                                    >
                                      Settimana {w}
                                    </button>
                                  );
                                });
                              })()}
                            </div>
                          </div>

                          {/* Selected Week Phase info */}
                          <div className="bg-black/20 border border-white/5 rounded-xl p-3.5 flex items-start gap-3 mt-1 backdrop-blur-sm">
                            <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-200">
                                  Fase: {getPhaseInfo(currentWeek).phase}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 font-light leading-relaxed">
                                {getPhaseInfo(currentWeek).description}
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
                            <div className="flex items-center gap-1 bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 w-full sm:w-36 justify-center">
                              <input
                                type="number"
                                step="0.1"
                                value={personalWeight === 0 ? '' : personalWeight}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setPersonalWeight(val === '' ? 0 : parseFloat(val));
                                }}
                                className="w-16 bg-transparent text-center focus:outline-none focus:ring-0 font-mono font-bold text-slate-150 text-sm"
                                placeholder="70.0"
                              />
                              <span className="text-xs font-bold text-slate-400 font-mono">kg</span>
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
                    </div>
                  ) : (
                    /* Active Workout Session Panel */
                    <div className="max-w-3xl mx-auto w-full space-y-6">
                      
                      {/* Session details banner */}
                      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
                        <div className="space-y-1.5 max-w-md">
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
                          <p className="text-xs text-slate-400 leading-relaxed font-light">
                            {getPhaseInfo(activeSession.week).description}
                          </p>
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
                              const isCompleted = ex.sets.length > 0 && ex.sets.every(set => set.completed);
                              const isExpanded = !isCompleted || !!manuallyExpanded[ex.exerciseId];
                              
                              return (
                                <div
                                  key={ex.exerciseId}
                                  id={`exercise-card-${exIdx}`}
                                  className="transition-all duration-300"
                                >
                                  {!isExpanded ? (
                                    /* COMPACT COLLAPSED CARD */
                                    <div className="bg-emerald-950/20 backdrop-blur-md border border-emerald-500/20 rounded-2xl p-4 shadow-lg flex items-center justify-between gap-4 transition-all duration-300">
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-450 flex items-center justify-center shrink-0 border border-emerald-500/30">
                                          <Check size={16} strokeWidth={3} />
                                        </div>
                                        <div className="min-w-0">
                                          <h3 className="font-bold text-slate-150 text-sm sm:text-base font-display truncate">
                                            {ex.exerciseName}
                                          </h3>
                                          <p className="text-xs text-slate-400 font-light mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 items-center">
                                            <span>{ex.sets.length} serie completate</span>
                                            <span className="text-slate-500">•</span>
                                            <span className="font-mono text-emerald-400 font-medium text-[11px]">
                                              {ex.sets.map(s => `${s.reps}${s.weight > 0 ? `+${s.weight}kg` : ''}`).join(' | ')}
                                            </span>
                                          </p>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => setManuallyExpanded(prev => ({ ...prev, [ex.exerciseId]: true }))}
                                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 rounded-xl transition-all shrink-0 flex items-center gap-1.5 shadow-sm"
                                      >
                                        <Edit3 size={12} />
                                        <span>Modifica</span>
                                      </button>
                                    </div>
                                  ) : (
                                    /* FULL DETAILED CARD */
                                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 md:p-6 space-y-4 shadow-xl">
                                      {/* Exercise title & details */}
                                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/10 pb-3">
                                        <div>
                                          <div className="flex items-center gap-2.5">
                                            <h3 className="font-bold text-slate-100 text-base font-display">{ex.exerciseName}</h3>
                                            {isCompleted && (
                                              <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 text-[10px] font-bold rounded-full uppercase tracking-wider font-mono">
                                                Completato
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-xs text-slate-400 font-light leading-relaxed mt-0.5">{template?.notes}</p>
                                        </div>
                                        <div className="flex gap-2 font-mono text-[10px] shrink-0 mt-1 sm:mt-0 items-center">
                                          <span className="px-2 py-0.5 bg-blue-500/15 text-blue-300 border border-blue-500/20 rounded">
                                            Target: {template?.targetSets}x{template?.targetReps}
                                          </span>
                                          <span className="px-2 py-0.5 bg-amber-500/15 text-amber-300 border border-amber-500/20 rounded font-mono text-[10px]">
                                            Diff: {template?.difficulty ?? 1}
                                          </span>
                                          <span className="px-2 py-0.5 bg-white/5 text-slate-350 border border-white/10 rounded">
                                            Recupero: {template?.restSeconds}s
                                          </span>
                                          {isCompleted && (
                                            <button
                                              onClick={() => setManuallyExpanded(prev => ({ ...prev, [ex.exerciseId]: false }))}
                                              className="ml-1 px-2.5 py-0.5 bg-slate-500/15 hover:bg-slate-500/25 border border-slate-500/20 text-slate-300 text-[10px] font-semibold rounded transition flex items-center gap-1"
                                              title="Comprimi scheda"
                                            >
                                              Comprimi
                                            </button>
                                          )}
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
                                              {set.completed && (
                                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded shadow-sm shrink-0" title="Punteggio di Forza Stimato">
                                                  Forza: {parseFloat(((personalWeight + set.weight) * (1 + ((template?.isIsometric ? (set.reps / 2.5) : set.reps) / 30)) * (template?.difficulty ?? 1)).toFixed(1))} pt
                                                </span>
                                              )}
                                            </div>

                                            <div className="flex items-center gap-6 justify-between sm:justify-end">
                                              {/* Reps Controller */}
                                              <div className="space-y-1">
                                                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wide block font-mono">
                                                  {template?.isIsometric ? 'Secondi' : 'Ripetizioni'}
                                                </span>
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
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Session Notes & Action Section */}
                        <div id="session-notes-section" className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
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
                  workoutProgram={workoutProgram}
                  onGenerateMockData={handleGenerateMockData}
                  onClearData={handleClearAllData}
                />
              )}

              {/* TAB 4: EDUCATIONAL (SCHEDA DETTAGLIATA) */}
              {activeTab === 'scheda' && (
                <div className="space-y-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 shadow-xl">
                  {/* Header & Editing Controls */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-bold font-display text-slate-100">Scheda Calisthenics Personalizzabile</h2>
                      <p className="text-sm text-slate-400 font-light leading-relaxed">
                        {isEditingProgram 
                          ? "Fase di modifica: aggiungi, rimuovi o personalizza gli esercizi per ogni giorno." 
                          : "Consulta i dettagli teorici del programma ed edita gli esercizi in base alle tue esigenze."
                        }
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 shrink-0">
                      {!isEditingProgram ? (
                        <button
                          onClick={handleStartEditingProgram}
                          className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-xs font-bold text-white rounded-xl shadow-lg shadow-blue-500/10 transition-all flex items-center gap-1.5"
                        >
                          <Edit3 size={14} />
                          Modifica Programma
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={handleSaveProgram}
                            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-xs font-bold text-white rounded-xl shadow-lg shadow-emerald-500/10 transition-all flex items-center gap-1.5"
                          >
                            <Save size={14} />
                            Salva Modifiche
                          </button>
                          
                          <button
                            onClick={handleCancelProgramEdit}
                            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 rounded-xl transition-all flex items-center gap-1.5"
                          >
                            <X size={14} />
                            Annulla
                          </button>

                          <button
                            onClick={() => setShowResetConfirm(true)}
                            className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                            title="Ripristina programma predefinito"
                          >
                            <Undo size={14} />
                            Ripristina Default
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Program blocks container */}
                  <div className="space-y-10">
                    {(!isEditingProgram ? workoutProgram : tempWorkoutProgram).map((p, blockIdx) => (
                      <div key={blockIdx} className="space-y-6">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 font-mono font-bold flex items-center justify-center text-sm shadow-md">
                            {blockIdx + 1}
                          </span>
                          <div>
                            <h3 className="font-bold text-lg text-slate-200 font-display">
                              Settimane {p.weeks[0]}-{p.weeks[p.weeks.length - 1]} – {p.phase}
                            </h3>
                            {isEditingProgram ? (
                              <input
                                type="text"
                                value={p.description}
                                onChange={(e) => {
                                  const updated = [...tempWorkoutProgram];
                                  updated[blockIdx].description = e.target.value;
                                  setTempWorkoutProgram(updated);
                                }}
                                className="w-full mt-1 bg-black/40 border border-white/10 focus:border-blue-500 focus:outline-none p-2 rounded-lg text-xs text-slate-300 italic font-light placeholder-slate-600"
                                placeholder="Descrizione fase d'allenamento..."
                              />
                            ) : (
                              <p className="text-xs text-slate-400 italic font-light">{p.description}</p>
                            )}
                          </div>
                        </div>

                        {/* Days overview (Read-only view vs Edit view) */}
                        {!isEditingProgram ? (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-0 md:pl-11">
                            {p.days.map((d, dIdx) => (
                              <div key={dIdx} className="bg-black/20 border border-white/5 rounded-xl p-4 space-y-3 shadow-md">
                                <h4 className="font-bold text-blue-400 text-sm border-b border-white/5 pb-1.5 flex items-center justify-between font-display">
                                  <span>Giorno {d.day}</span>
                                  <span className="text-[10px] text-slate-400 font-mono capitalize">{d.name}</span>
                                </h4>
                                
                                <div className="space-y-2.5">
                                  {d.exercises.map((ex, exIdx) => (
                                    <div key={exIdx} className="flex justify-between items-start text-xs text-slate-300 py-0.5 border-b border-white/[0.02] last:border-b-0">
                                      <div className="flex flex-col min-w-0 pr-2">
                                        <span className="font-medium text-slate-200 truncate">{ex.name}</span>
                                        {ex.notes && <span className="text-[10px] text-slate-500 italic truncate max-w-[170px]">{ex.notes}</span>}
                                      </div>
                                      <div className="shrink-0 flex flex-col items-end font-mono">
                                        <span className="font-bold text-blue-300 text-[10px]">
                                          {ex.targetSets}x{ex.targetReps}
                                        </span>
                                        {ex.defaultWeight > 0 && (
                                          <span className="text-[9px] text-emerald-400">
                                            +{ex.defaultWeight} kg
                                          </span>
                                        )}
                                        <span className="text-[9px] text-amber-500/90 mt-0.5" title="Fattore di Difficoltà">
                                          Diff: {ex.difficulty ?? 1}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                  {d.exercises.length === 0 && (
                                    <p className="text-xs text-slate-500 italic text-center py-2">Nessun esercizio</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          // Full Exercise Customization Mode
                          <div className="grid grid-cols-1 gap-8 pl-0 md:pl-11">
                            {p.days.map((d, dIdx) => (
                              <div key={d.day} className="bg-black/35 border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/35 text-xs font-mono font-bold rounded-lg shadow-sm">
                                      Giorno {d.day}
                                    </span>
                                    <input
                                      type="text"
                                      value={d.name}
                                      onChange={(e) => {
                                        const updated = [...tempWorkoutProgram];
                                        updated[blockIdx].days[dIdx].name = e.target.value;
                                        setTempWorkoutProgram(updated);
                                      }}
                                      className="bg-black/20 border border-white/5 hover:border-white/20 focus:border-blue-500 focus:outline-none text-xs font-semibold text-slate-100 px-2 py-1 rounded-lg font-display"
                                      placeholder="es. Full Body"
                                    />
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {d.exercises.length} {d.exercises.length === 1 ? 'Esercizio' : 'Esercizi'}
                                  </span>
                                </div>

                                {/* Exercises lists for customization */}
                                <div className="space-y-4">
                                  {d.exercises.map((ex, exIdx) => (
                                    <div key={ex.id} className="bg-black/30 border border-white/15 rounded-xl p-4 space-y-3 relative group shadow-md hover:border-white/25 transition-all">
                                      <div className="flex items-center justify-between gap-4">
                                        <div className="flex-1 space-y-1">
                                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Nome Esercizio</label>
                                          <div className="flex flex-col sm:flex-row gap-2">
                                            <select
                                              value={PREDEFINED_EXERCISES.includes(ex.name) ? ex.name : 'Altro (Personalizzato)...'}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === 'Altro (Personalizzato)...') {
                                                  handleUpdateExercise(blockIdx, dIdx, exIdx, { name: 'Nuovo Esercizio' });
                                                } else {
                                                  handleUpdateExercise(blockIdx, dIdx, exIdx, { name: val });
                                                }
                                              }}
                                              className="flex-1 bg-slate-900 border border-white/10 focus:border-blue-500 focus:outline-none p-2 rounded-lg text-xs text-slate-200"
                                            >
                                              {PREDEFINED_EXERCISES.map((option) => (
                                                <option key={option} value={option} className="bg-slate-900 text-slate-200">
                                                  {option}
                                                </option>
                                              ))}
                                            </select>

                                            {(!PREDEFINED_EXERCISES.includes(ex.name) || ex.name === 'Nuovo Esercizio') && (
                                              <input
                                                type="text"
                                                value={ex.name === 'Altro (Personalizzato)...' ? '' : ex.name}
                                                onChange={(e) => handleUpdateExercise(blockIdx, dIdx, exIdx, { name: e.target.value })}
                                                placeholder="Nome personalizzato"
                                                className="flex-1 bg-slate-900 border border-white/10 focus:border-blue-500 focus:outline-none p-2 rounded-lg text-xs text-slate-200 font-semibold"
                                              />
                                            )}
                                          </div>
                                        </div>

                                        <button
                                          onClick={() => handleRemoveExercise(blockIdx, dIdx, exIdx)}
                                          className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg transition-colors mt-4 self-start"
                                          title="Elimina esercizio"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>

                                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                        <div className="space-y-1">
                                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Tipo Esercizio</label>
                                          <select
                                            value={ex.isIsometric ? 'isometric' : 'reps'}
                                            onChange={(e) => {
                                              const isIso = e.target.value === 'isometric';
                                              handleUpdateExercise(blockIdx, dIdx, exIdx, {
                                                isIsometric: isIso,
                                                targetReps: isIso ? '30s' : '10'
                                              });
                                            }}
                                            className="w-full bg-slate-900 border border-white/10 focus:border-blue-500 focus:outline-none p-2 rounded-lg text-xs text-slate-200"
                                          >
                                            <option value="reps">Classico (Reps)</option>
                                            <option value="isometric">Isometrico (Tempo)</option>
                                          </select>
                                        </div>

                                        <div className="space-y-1">
                                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Serie (Sets)</label>
                                          <div className="flex items-center justify-between bg-slate-900 border border-white/10 rounded-lg p-1">
                                            <button
                                              onClick={() => handleUpdateExercise(blockIdx, dIdx, exIdx, { targetSets: Math.max(1, ex.targetSets - 1) })}
                                              className="p-1 hover:bg-white/10 rounded text-slate-400 transition-colors"
                                            >
                                              <Minus size={11} />
                                            </button>
                                            <span className="font-mono text-xs font-bold text-slate-200">{ex.targetSets}</span>
                                            <button
                                              onClick={() => handleUpdateExercise(blockIdx, dIdx, exIdx, { targetSets: ex.targetSets + 1 })}
                                              className="p-1 hover:bg-white/10 rounded text-slate-400 transition-colors"
                                            >
                                              <Plus size={11} />
                                            </button>
                                          </div>
                                        </div>

                                        <div className="space-y-1">
                                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                                            {ex.isIsometric ? 'Tempo (sec)' : 'Ripetizioni'}
                                          </label>
                                          <input
                                            type="text"
                                            value={ex.targetReps}
                                            onChange={(e) => handleUpdateExercise(blockIdx, dIdx, exIdx, { targetReps: e.target.value })}
                                            placeholder={ex.isIsometric ? 'es. 30s' : 'es. 10'}
                                            className="w-full bg-slate-900 border border-white/10 focus:border-blue-500 focus:outline-none p-2 rounded-lg text-xs text-slate-200 font-mono font-bold text-center"
                                          />
                                        </div>

                                        <div className="space-y-1">
                                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Peso Zavorra (kg)</label>
                                          <div className="flex items-center justify-between bg-slate-900 border border-white/10 rounded-lg p-1">
                                            <button
                                              onClick={() => handleUpdateExercise(blockIdx, dIdx, exIdx, { defaultWeight: Math.max(0, ex.defaultWeight - 1) })}
                                              className="p-1 hover:bg-white/10 rounded text-slate-400 transition-colors"
                                            >
                                              <Minus size={11} />
                                            </button>
                                            <input
                                              type="number"
                                              step="0.5"
                                              value={ex.defaultWeight}
                                              onChange={(e) => handleUpdateExercise(blockIdx, dIdx, exIdx, { defaultWeight: parseFloat(e.target.value) || 0 })}
                                              className="w-10 text-center bg-transparent focus:outline-none font-mono text-xs font-bold text-slate-200"
                                            />
                                            <button
                                              onClick={() => handleUpdateExercise(blockIdx, dIdx, exIdx, { defaultWeight: ex.defaultWeight + 1 })}
                                              className="p-1 hover:bg-white/10 rounded text-slate-400 transition-colors"
                                            >
                                              <Plus size={11} />
                                            </button>
                                          </div>
                                        </div>

                                        <div className="space-y-1">
                                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Difficoltà</label>
                                          <div className="flex items-center justify-between bg-slate-900 border border-white/10 rounded-lg p-1">
                                            <button
                                              onClick={() => handleUpdateExercise(blockIdx, dIdx, exIdx, { difficulty: Math.max(0.1, parseFloat(((ex.difficulty ?? 1) - 0.1).toFixed(1))) })}
                                              className="p-1 hover:bg-white/10 rounded text-slate-400 transition-colors"
                                            >
                                              <Minus size={11} />
                                            </button>
                                            <input
                                              type="number"
                                              step="0.1"
                                              min="0.1"
                                              value={ex.difficulty ?? 1}
                                              onChange={(e) => handleUpdateExercise(blockIdx, dIdx, exIdx, { difficulty: parseFloat(e.target.value) || 1 })}
                                              className="w-10 text-center bg-transparent focus:outline-none font-mono text-xs font-bold text-slate-200"
                                            />
                                            <button
                                              onClick={() => handleUpdateExercise(blockIdx, dIdx, exIdx, { difficulty: parseFloat(((ex.difficulty ?? 1) + 0.1).toFixed(1)) })}
                                              className="p-1 hover:bg-white/10 rounded text-slate-400 transition-colors"
                                            >
                                              <Plus size={11} />
                                            </button>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                        <div className="space-y-1">
                                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Note / Indicazioni speciali</label>
                                          <input
                                            type="text"
                                            value={ex.notes || ''}
                                            onChange={(e) => handleUpdateExercise(blockIdx, dIdx, exIdx, { notes: e.target.value })}
                                            placeholder="Istruzioni o dettagli per l'esecuzione..."
                                            className="w-full bg-slate-900 border border-white/10 focus:border-blue-500 focus:outline-none p-2 rounded-lg text-xs text-slate-300 placeholder-slate-600"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Recupero (secondi)</label>
                                          <div className="flex items-center justify-between bg-slate-900 border border-white/10 rounded-lg p-1">
                                            <button
                                              onClick={() => handleUpdateExercise(blockIdx, dIdx, exIdx, { restSeconds: Math.max(0, ex.restSeconds - 15) })}
                                              className="p-1 hover:bg-white/10 rounded text-slate-400 transition-colors"
                                            >
                                              <Minus size={11} />
                                            </button>
                                            <span className="font-mono text-xs font-bold text-slate-200">{ex.restSeconds}s</span>
                                            <button
                                              onClick={() => handleUpdateExercise(blockIdx, dIdx, exIdx, { restSeconds: ex.restSeconds + 15 })}
                                              className="p-1 hover:bg-white/10 rounded text-slate-400 transition-colors"
                                            >
                                              <Plus size={11} />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}

                                  {d.exercises.length === 0 && (
                                    <p className="text-xs text-slate-500 italic text-center py-4">Nessun esercizio per questo giorno.</p>
                                  )}

                                  <button
                                    onClick={() => handleAddExercise(blockIdx, dIdx)}
                                    className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-dashed border-white/15 rounded-xl text-xs font-bold text-slate-300 hover:text-slate-100 flex items-center justify-center gap-1.5 transition-all"
                                  >
                                    <Plus size={14} />
                                    Aggiungi Esercizio a Giorno {d.day}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
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
                          Mantieni <strong>90-120 secondi</strong> di recupero per gli esercizi di trazione pura (Trazioni), e <strong>60-75 secondi</strong> per gli altri esercizi. I circuiti (settimane 9-12 giorno C) prevedono invece <strong>2 minuti</strong> completi di riposo solo dopo aver completato un intero giro di 4 esercizi.
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

      {/* Reset Program Confirmation Overlay Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 text-slate-100"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#1e293b] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative z-50"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <AlertCircle size={24} />
                <h3 className="font-bold text-lg text-slate-100 font-display">Ripristina Programma?</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-light">
                Sei sicuro di voler ripristinare il programma originale? Questa azione sovrascriverà in modo permanente tutte le personalizzazioni e gli esercizi che hai inserito.
              </p>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 rounded-xl transition-all"
                >
                  Annulla
                </button>
                <button
                  onClick={handleResetProgramToDefault}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white rounded-xl shadow-lg shadow-rose-600/20 transition-all flex items-center gap-1.5"
                >
                  <Undo size={14} />
                  Ripristina Default
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Active Timer Widget */}
      {activeSession && activeTab === 'allenamento' && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex justify-end pointer-events-none">
          <Timer
            initialSeconds={timerTargetSeconds}
            autoStartOnSet={autoStartTimer}
            onAutoStartChange={setAutoStartTimer}
            trigger={timerTrigger}
          />
        </div>
      )}
    </div>
  );
}
