/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WeekTemplate, Phase, DayTemplate } from './types';

export const WORKOUT_PROGRAM: WeekTemplate[] = [
  {
    weeks: [1, 2, 3, 4],
    phase: 'Costruzione',
    description: 'Focalizzati sulla forma, la costanza e l\'adattamento tendineo/muscolare.',
    days: [
      {
        day: 'A',
        name: 'Trazione + Gambe',
        warmup: [
          'Mobilità spalle (circonduzioni, dislocazioni con bastone/banda)',
          '2 serie di scapular pull-up (8-10 ripetizioni lente)',
          'Squat a corpo libero controllati (10-12 ripetizioni)',
          'Rotazioni delle anche (mobilità articolare)'
        ],
        exercises: [
          {
            id: 'w14_a_trazioni',
            name: 'Trazioni al mento',
            targetSets: 5,
            targetReps: '5',
            defaultWeight: 0,
            notes: 'Focalizzati sulla contrazione dorsale e discesa controllata. Recupero completo.',
            restSeconds: 90
          },
          {
            id: 'w14_a_bulgarian',
            name: 'Bulgarian Split Squat',
            targetSets: 4,
            targetReps: '8',
            defaultWeight: 12,
            notes: 'Mantieni l\'equilibrio, ginocchio posteriore quasi sfiora terra. Usa un manubrio da 12 kg (o due da 6 kg).',
            restSeconds: 75
          },
          {
            id: 'w14_a_rematore',
            name: 'Rematore con Manubrio',
            targetSets: 4,
            targetReps: '10',
            defaultWeight: 12,
            notes: 'Tira verso l\'anca, gomito stretto al corpo.',
            restSeconds: 60
          },
          {
            id: 'w14_a_plank',
            name: 'Plank',
            targetSets: 3,
            targetReps: '45-60s',
            defaultWeight: 0,
            notes: 'Retroversione del bacino attiva, glutei contratti.',
            restSeconds: 60,
            isIsometric: true
          },
          {
            id: 'w14_a_hollow',
            name: 'Hollow Hold',
            targetSets: 3,
            targetReps: '20-30s',
            defaultWeight: 0,
            notes: 'Bassa schiena costantemente incollata al pavimento.',
            restSeconds: 60,
            isIsometric: true
          }
        ]
      },
      {
        day: 'B',
        name: 'Spinta',
        warmup: [
          'Riscaldamento articolare polsi e gomiti',
          'Mobilità spalle',
          'Riscaldamento cuffia dei rotatori (YTWL o elastico)',
          '3-5 Push-up facilitati'
        ],
        exercises: [
          {
            id: 'w14_b_pushup',
            name: 'Push-up',
            targetSets: 4,
            targetReps: '10-15',
            defaultWeight: 0,
            notes: 'Corpo dritto come una tavola. Quando arrivi a 15 ripetizioni facili in tutte le serie, metti 4-6 kg nello zaino.',
            restSeconds: 75
          },
          {
            id: 'w14_b_pike',
            name: 'Pike Push-up',
            targetSets: 4,
            targetReps: '8-10',
            defaultWeight: 0,
            notes: 'Spingi in alto e indietro per focalizzare sulle spalle.',
            restSeconds: 75
          },
          {
            id: 'w14_b_goblet',
            name: 'Goblet Squat (Lento)',
            targetSets: 4,
            targetReps: '12',
            defaultWeight: 12,
            notes: 'Usa un manubrio da 12 kg. Discesa controllata e risalita fluida.',
            restSeconds: 60
          },
          {
            id: 'w14_b_curl',
            name: 'Curl con Manubrio',
            targetSets: 3,
            targetReps: '10',
            defaultWeight: 10,
            notes: 'Controllo della fase eccentrica senza dondolare.',
            restSeconds: 60
          },
          {
            id: 'w14_b_sideplank',
            name: 'Side Plank',
            targetSets: 3,
            targetReps: '40s',
            defaultWeight: 0,
            notes: 'Bacino alto e allineato.',
            restSeconds: 60,
            isIsometric: true
          }
        ]
      },
      {
        day: 'C',
        name: 'Full Body',
        warmup: [
          'Mobilità generale (spalle, anche, colonna vertebrale)',
          'Circonduzioni braccia e gambe',
          'Qualche squat e push-up leggeri'
        ],
        exercises: [
          {
            id: 'w14_c_trazioni',
            name: 'Trazioni al mento',
            targetSets: 4,
            targetReps: 'max -2',
            defaultWeight: 0,
            notes: 'Arriva vicino al cedimento ma mantieni sempre 2 ripetizioni di riserva (RIR 2).',
            restSeconds: 90
          },
          {
            id: 'w14_c_affondi',
            name: 'Affondi alternati',
            targetSets: 3,
            targetReps: '10',
            defaultWeight: 0,
            notes: 'Usa il peso corporeo o piccoli manubri se facile. Passo lungo.',
            restSeconds: 60
          },
          {
            id: 'w14_c_elev_pushup',
            name: 'Push-up Piedi Rialzati',
            targetSets: 3,
            targetReps: '10',
            defaultWeight: 0,
            notes: 'Appoggia i piedi su una sedia o un rialzo stabile.',
            restSeconds: 75
          },
          {
            id: 'w14_c_rdl',
            name: 'Romanian Deadlift (con manubrio)',
            targetSets: 3,
            targetReps: '12',
            defaultWeight: 12,
            notes: 'Concentrati sullo sblocco dell\'anca (hip hinge) e allungamento dei bicipiti femorali.',
            restSeconds: 60
          },
          {
            id: 'w14_c_knee_raise',
            name: 'Hanging Knee Raise',
            targetSets: 3,
            targetReps: '12',
            defaultWeight: 0,
            notes: 'Appeso alla sbarra, porta le ginocchia al petto controllando il dondolio.',
            restSeconds: 60
          }
        ]
      }
    ]
  },
  {
    weeks: [5, 6, 7, 8],
    phase: 'Intensità',
    description: 'Aumento dell\'intensità: discese controllate, versioni zavorrate obbligatorie e core avanzato.',
    days: [
      {
        day: 'A',
        name: 'Trazione + Gambe',
        warmup: [
          'Mobilità spalle',
          '2 serie di scapular pull-up (8-10)',
          'Squat a corpo libero controllati',
          'Rotazioni anche'
        ],
        exercises: [
          {
            id: 'w58_a_trazioni',
            name: 'Trazioni (6x4 o 5x6)',
            targetSets: 5,
            targetReps: '6 (o 6x4)',
            defaultWeight: 0,
            notes: 'Seleziona 6x4 o 5x6. Quando fai facilmente 5x8 in altre sessioni, aggiungi un piccolo sovraccarico.',
            restSeconds: 90
          },
          {
            id: 'w58_a_bulgarian',
            name: 'Bulgarian Split Squat (Lento)',
            targetSets: 4,
            targetReps: '8',
            defaultWeight: 12,
            notes: 'DISCESA LENTA in 3 secondi. Senti bene il carico sul quadricipite e gluteo.',
            restSeconds: 75
          },
          {
            id: 'w58_a_rematore',
            name: 'Rematore con Manubrio',
            targetSets: 4,
            targetReps: '10',
            defaultWeight: 12,
            notes: 'Gomito stretto, contrai i dorsali nella parte superiore.',
            restSeconds: 60
          },
          {
            id: 'w58_a_one_arm_plank',
            name: 'Plank Monobraccio',
            targetSets: 3,
            targetReps: '45-60s',
            defaultWeight: 0,
            notes: 'Plank sollevando un braccio dritto davanti a te. Alterna o mantieni per metà tempo.',
            restSeconds: 60,
            isIsometric: true
          },
          {
            id: 'w58_a_hollow',
            name: 'Hollow Hold',
            targetSets: 3,
            targetReps: '20-30s',
            defaultWeight: 0,
            notes: 'Addome contratto al massimo, lombare a terra.',
            restSeconds: 60,
            isIsometric: true
          },
          {
            id: 'w58_a_farmer',
            name: 'Farmer Carry (con manubrio)',
            targetSets: 3,
            targetReps: '45s',
            defaultWeight: 12,
            notes: 'Cammina mantenendo una postura dritta con il manubrio da 12 kg in una mano (cambia lato a metà o a serie alterne).',
            restSeconds: 60,
            isIsometric: true
          }
        ]
      },
      {
        day: 'B',
        name: 'Spinta',
        warmup: [
          'Riscaldamento articolare polsi, gomiti, spalle',
          '3-5 Push-up a terra fluidi'
        ],
        exercises: [
          {
            id: 'w58_b_weighted_pushup',
            name: 'Push-up Zavorrati',
            targetSets: 4,
            targetReps: '8-12',
            defaultWeight: 5,
            notes: 'ZAVORRA OBBLIGATORIA (usa uno zaino con 4-6 kg). Mantieni il core compatto.',
            restSeconds: 75
          },
          {
            id: 'w58_b_pike',
            name: 'Pike Push-up',
            targetSets: 4,
            targetReps: '8-10',
            defaultWeight: 0,
            notes: 'Spingi dritto e indietro. Incrementa il range di movimento se possibile.',
            restSeconds: 75
          },
          {
            id: 'w58_b_goblet',
            name: 'Goblet Squat (Lento)',
            targetSets: 4,
            targetReps: '12',
            defaultWeight: 12,
            notes: 'Manubrio da 12 kg stretto al petto. Discesa in 3 secondi.',
            restSeconds: 60
          },
          {
            id: 'w58_b_curl',
            name: 'Curl con Manubrio',
            targetSets: 3,
            targetReps: '10',
            defaultWeight: 10,
            notes: 'Isolamento del bicipite.',
            restSeconds: 60
          },
          {
            id: 'w58_b_sideplank',
            name: 'Side Plank',
            targetSets: 3,
            targetReps: '40s',
            defaultWeight: 0,
            notes: 'Mantieni l\'allineamento.',
            restSeconds: 60,
            isIsometric: true
          }
        ]
      },
      {
        day: 'C',
        name: 'Full Body',
        warmup: [
          'Circonduzioni articolari totali',
          'Riscaldamento generale 5 minuti'
        ],
        exercises: [
          {
            id: 'w58_c_trazioni',
            name: 'Trazioni al mento',
            targetSets: 4,
            targetReps: 'max -2',
            defaultWeight: 0,
            notes: 'Massimo controllo, non oscillare.',
            restSeconds: 90
          },
          {
            id: 'w58_c_affondi',
            name: 'Affondi alternati',
            targetSets: 3,
            targetReps: '10',
            defaultWeight: 0,
            notes: 'Resta dritto con il busto.',
            restSeconds: 60
          },
          {
            id: 'w58_c_elev_pushup',
            name: 'Push-up Piedi Rialzati',
            targetSets: 3,
            targetReps: '10',
            defaultWeight: 0,
            notes: 'Squeeze del petto in cima.',
            restSeconds: 75
          },
          {
            id: 'w58_c_rdl',
            name: 'Romanian Deadlift',
            targetSets: 3,
            targetReps: '12',
            defaultWeight: 12,
            notes: 'Focus sull\'estensione dell\'anca attivando glutei e femorali.',
            restSeconds: 60
          },
          {
            id: 'w58_c_knee_raise',
            name: 'Hanging Knee Raise',
            targetSets: 3,
            targetReps: '12',
            defaultWeight: 0,
            notes: 'Movimento lento ed estremamente controllato.',
            restSeconds: 60
          }
        ]
      }
    ]
  },
  {
    weeks: [9, 10, 11, 12],
    phase: 'Forza',
    description: 'Lavoro puro sulla forza: carichi submassimali zavorrati e un circuito metabolico finale ad alta densità.',
    days: [
      {
        day: 'A',
        name: 'Forza Trazione + Gambe',
        warmup: [
          'Mobilità spalle attiva',
          '2 serie di scapular pull-up (10)',
          '5 Trazioni a corpo libero veloci',
          'Squat a corpo libero'
        ],
        exercises: [
          {
            id: 'w912_a_weighted_pullup',
            name: 'Trazioni con Zaino Zavorrato',
            targetSets: 5,
            targetReps: '4',
            defaultWeight: 6,
            notes: 'Aggiungi peso nello zaino (4-8 kg). Forza pura. Se non riesci, torna a corpo libero completo.',
            restSeconds: 120
          },
          {
            id: 'w912_a_bulgarian',
            name: 'Bulgarian Split Squat',
            targetSets: 4,
            targetReps: '8',
            defaultWeight: 12,
            notes: 'Mantieni l\'esecuzione solida sotto carico.',
            restSeconds: 75
          },
          {
            id: 'w912_a_rematore',
            name: 'Rematore con Manubrio',
            targetSets: 4,
            targetReps: '10',
            defaultWeight: 14,
            notes: 'Cerca di aumentare leggermente il peso se possibile.',
            restSeconds: 60
          },
          {
            id: 'w912_a_plank',
            name: 'Plank',
            targetSets: 3,
            targetReps: '45-60s',
            defaultWeight: 0,
            notes: 'Massima rigidità corporea.',
            restSeconds: 60,
            isIsometric: true
          },
          {
            id: 'w912_a_hollow',
            name: 'Hollow Hold',
            targetSets: 3,
            targetReps: '20-30s',
            defaultWeight: 0,
            notes: 'Non perdere la forma.',
            restSeconds: 60,
            isIsometric: true
          }
        ]
      },
      {
        day: 'B',
        name: 'Forza Spinta',
        warmup: [
          'Riscaldamento articolare accurato',
          'Push-up leggeri di riscaldamento'
        ],
        exercises: [
          {
            id: 'w912_b_weighted_pushup',
            name: 'Push-up Zavorrati (Forza)',
            targetSets: 5,
            targetReps: '6-8',
            defaultWeight: 6,
            notes: 'Zavorra pesante nello zaino (6-10 kg). Spinta esplosiva, discesa controllata.',
            restSeconds: 120
          },
          {
            id: 'w912_b_pike',
            name: 'Pike Push-up',
            targetSets: 4,
            targetReps: '8-10',
            defaultWeight: 0,
            notes: 'Se facile, eleva i piedi per aumentare il carico sulle spalle.',
            restSeconds: 75
          },
          {
            id: 'w912_b_goblet',
            name: 'Goblet Squat (Lento)',
            targetSets: 4,
            targetReps: '12',
            defaultWeight: 12,
            notes: 'Lento ed esplosivo.',
            restSeconds: 60
          },
          {
            id: 'w912_b_curl',
            name: 'Curl con Manubrio',
            targetSets: 3,
            targetReps: '10',
            defaultWeight: 12,
            notes: 'Mantieni i gomiti fermi.',
            restSeconds: 60
          },
          {
            id: 'w912_b_sideplank',
            name: 'Side Plank',
            targetSets: 3,
            targetReps: '40s',
            defaultWeight: 0,
            notes: 'Mantieni l\'estensione dell\'anca.',
            restSeconds: 60,
            isIsometric: true
          }
        ]
      },
      {
        day: 'C',
        name: 'Circuito Metabolico',
        warmup: [
          'Mobilità totale per 5-7 minuti',
          'Esegui 1 ripetizione per ogni esercizio del circuito per testare l\'esecuzione'
        ],
        isCircuit: true,
        circuitRounds: 3,
        circuitRestSeconds: 120, // 2 minuti di recupero tra i giri
        exercises: [
          {
            id: 'w912_c_trazioni',
            name: 'Trazioni al mento',
            targetSets: 3, // Corresponds to 3 rounds
            targetReps: '5',
            defaultWeight: 0,
            notes: 'Esplosive e controllate.',
            restSeconds: 0 // No rest in circuit
          },
          {
            id: 'w912_c_pushup',
            name: 'Push-up',
            targetSets: 3,
            targetReps: '10',
            defaultWeight: 0,
            notes: 'Mantieni un buon ritmo.',
            restSeconds: 0
          },
          {
            id: 'w912_c_affondi',
            name: 'Affondi',
            targetSets: 3,
            targetReps: '10 (totale)',
            defaultWeight: 0,
            notes: 'Alternati, veloci ma precisi.',
            restSeconds: 0
          },
          {
            id: 'w912_c_plank',
            name: 'Plank',
            targetSets: 3,
            targetReps: '30s',
            defaultWeight: 0,
            notes: 'Resisti con l\'addome di marmo.',
            restSeconds: 120, // This rest is actually after completing the whole round!
            isIsometric: true
          }
        ]
      }
    ]
  }
];

export function getWorkoutForWeekAndDay(week: number, day: 'A' | 'B' | 'C'): DayTemplate | null {
  const template = WORKOUT_PROGRAM.find(p => p.weeks.includes(week));
  if (!template) return null;
  const dayWorkout = template.days.find(d => d.day === day);
  return dayWorkout || null;
}

export function getPhaseForWeek(week: number): { phase: Phase; description: string } {
  const template = WORKOUT_PROGRAM.find(p => p.weeks.includes(week));
  if (!template) return { phase: 'Costruzione', description: '' };
  return { phase: template.phase, description: template.description };
}
