/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Phase = 'Costruzione' | 'Intensità' | 'Forza';

export interface ExerciseTemplate {
  id: string;
  name: string;
  targetSets: number;
  targetReps: string; // e.g. "5", "8/gamba", "10-15", "max -2", "45-60s"
  defaultWeight: number; // in kg, e.g. 12, 0, or weight parameter
  notes?: string;
  restSeconds: number; // default rest between sets
}

export interface DayTemplate {
  day: 'A' | 'B' | 'C';
  name: string; // e.g. "Trazione + Gambe"
  warmup: string[];
  exercises: ExerciseTemplate[];
  isCircuit?: boolean; // For Week 9-12 Day C
  circuitRounds?: number;
  circuitRestSeconds?: number;
}

export interface WeekTemplate {
  weeks: number[]; // e.g. [1, 2, 3, 4]
  phase: Phase;
  description: string;
  days: DayTemplate[];
}

export interface SetLog {
  reps: number;
  weight: number;
  completed: boolean;
  time?: string; // timestamp of set completion
}

export interface ExerciseLog {
  exerciseId: string;
  exerciseName: string;
  sets: SetLog[];
}

export interface WorkoutSession {
  id: string;
  date: string; // ISO string
  week: number;
  phase: Phase;
  day: 'A' | 'B' | 'C';
  dayName: string;
  personalWeight: number; // start weight of session
  exercises: ExerciseLog[];
  durationMinutes: number;
  notes: string;
  completed: boolean;
}

export interface UserPreferences {
  currentWeek: number;
  currentDay: 'A' | 'B' | 'C';
  personalWeight: number;
}
