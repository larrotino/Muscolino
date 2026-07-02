/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { WorkoutSession } from '../types';
import { Calendar, Clock, Weight, ChevronDown, ChevronUp, Trash2, BookOpen, Download, Upload, CheckCircle2 } from 'lucide-react';

interface HistoryProps {
  sessions: WorkoutSession[];
  onDeleteSession: (id: string) => void;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function History({ sessions, onDeleteSession, onExportData, onImportData }: HistoryProps) {
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const sortedSessions = [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const toggleExpand = (id: string) => {
    setExpandedSessionId(expandedSessionId === id ? null : id);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div id="workout-history" className="space-y-6">
      {/* Export / Import Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 gap-4 shadow-xl">
        <div className="space-y-1 text-center sm:text-left">
          <h4 className="font-semibold text-slate-200 text-sm font-mono">Backup dei Dati</h4>
          <p className="text-xs text-slate-450">Esporta o importa la cronologia dei tuoi allenamenti in formato JSON</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onExportData}
            className="px-3.5 py-2 bg-black/30 hover:bg-white/10 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition"
          >
            <Download size={14} />
            Esporta JSON
          </button>
          
          <label className="px-3.5 py-2 bg-black/30 hover:bg-white/10 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-white/10 cursor-pointer transition">
            <Upload size={14} />
            <span>Importa JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={onImportData}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {sortedSessions.length === 0 ? (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-12 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <Calendar size={28} />
          </div>
          <div className="space-y-2 max-w-sm mx-auto">
            <h3 className="font-bold text-slate-200 font-display">Ancora nessun allenamento</h3>
            <p className="text-xs text-slate-450 leading-relaxed">
              Inizia una sessione d'allenamento oggi stesso! Dopo aver completato gli esercizi e premuto "Termina", troverai qui la tua scheda compilata.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedSessions.map((session) => {
            const isExpanded = expandedSessionId === session.id;
            const totalRepsCount = session.exercises.reduce((sum, ex) => 
              sum + ex.sets.reduce((setSum, set) => setSum + (set.completed ? set.reps : 0), 0)
            , 0);

            return (
              <div
                key={session.id}
                className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 shadow-xl"
              >
                {/* Header Row (Summary) */}
                <div
                  onClick={() => toggleExpand(session.id)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-white/5 transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-500/15 text-emerald-300 rounded border border-emerald-500/30">
                        {session.phase}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-black/40 text-slate-300 rounded border border-white/5">
                        Settimana {session.week}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-blue-500/15 text-blue-300 rounded border border-blue-500/30">
                        Giorno {session.day} - {session.dayName}
                      </span>
                    </div>
                    
                    <h3 className="text-slate-100 font-bold text-base capitalize pt-0.5 font-display">
                      {formatDate(session.date)}
                    </h3>
                  </div>

                  {/* Summary Badges */}
                  <div className="flex items-center gap-6 self-start md:self-auto">
                    <div className="flex gap-4 text-xs font-mono text-slate-400">
                      <div className="flex items-center gap-1">
                        <Weight size={14} className="text-rose-400" />
                        <span>{session.personalWeight > 0 ? `${session.personalWeight} kg` : '--'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={14} className="text-amber-400" />
                        <span>{session.durationMinutes}m</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        <span>{totalRepsCount} rip</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-slate-400">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-white/10 bg-black/20 p-5 space-y-6">
                    {session.notes && (
                      <div className="bg-black/30 border border-white/5 rounded-xl p-3.5 flex gap-3 text-sm text-slate-300">
                        <BookOpen size={16} className="text-blue-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <span className="text-xs font-semibold text-slate-450 block font-mono">Note della sessione:</span>
                          <p className="italic font-light leading-relaxed text-slate-300">{session.notes}</p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {session.exercises.map((ex, exIdx) => (
                        <div
                          key={exIdx}
                          className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-3 shadow-md"
                        >
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-slate-200 text-sm font-display">
                              {ex.exerciseName}
                            </h4>
                            <span className="text-[10px] text-slate-450 font-mono">
                              {ex.sets.filter(s => s.completed).length}/{ex.sets.length} serie completate
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            {ex.sets.map((set, setIdx) => (
                              <div
                                key={setIdx}
                                className={`flex justify-between items-center px-3 py-1.5 rounded-lg text-xs font-mono border ${
                                  set.completed
                                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/15'
                                    : 'bg-black/30 text-slate-500 line-through border-transparent'
                                }`}
                              >
                                <span className="font-bold">Serie {setIdx + 1}</span>
                                <div className="flex gap-4">
                                  <span>{set.reps} rip</span>
                                  <span>
                                    {set.weight > 0 ? `+${set.weight} kg` : 'corpo lib.'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end pt-4 border-t border-white/10">
                      {deleteConfirmId === session.id ? (
                        <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl">
                          <span className="text-[10px] text-rose-300 font-mono font-bold uppercase mr-1">Sei sicuro?</span>
                          <button
                            onClick={() => {
                              onDeleteSession(session.id);
                              setDeleteConfirmId(null);
                            }}
                            className="text-[10px] text-white px-2.5 py-1 bg-rose-600 hover:bg-rose-500 rounded-lg transition font-mono font-bold uppercase tracking-wider"
                          >
                            Sì, Elimina
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-[10px] text-slate-300 px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg transition font-mono"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(session.id)}
                          className="text-xs text-rose-300 hover:text-rose-200 font-semibold flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition border border-rose-500/30 font-mono"
                        >
                          <Trash2 size={12} />
                          Elimina Log Allenamento
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
