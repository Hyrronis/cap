/**
 * Jeu de données de démonstration (aucune donnée réelle).
 *
 * Généré relativement à une date de référence pour que la démo paraisse
 * toujours « à jour » : 4 semaines terminées et bilanées (S-4 … S-1) + la
 * semaine en cours (S0) commencée, sans bilan.
 *
 * - « Courir 10 km » : progresse régulièrement (4 bilans « progress »).
 * - « Épargner 1 000 € » : 2 bons départs puis 2 semaines bloquées d'affilée
 *   (imprévu voiture + dépenses non notées) → analyse « Creuser la cause » faite
 *   après le dernier bilan, et plan ajusté pour la semaine en cours.
 */
import { addDays, toIsoDate, weekStart } from './calculs.ts';
import type {
  ActionLog,
  CapData,
  IsoDate,
  IsoDateTime,
  Measurement,
  PlannedAction,
  Week,
  WeeklyReview,
} from './types.ts';

/** Horodatage ISO pour un jour civil local à une heure donnée. */
function at(date: IsoDate, hour = 20, minute = 0): IsoDateTime {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, hour, minute).toISOString();
}

export const DEMO_GOAL_RUN = 'demo-goal-course';
export const DEMO_GOAL_SAVE = 'demo-goal-epargne';

export function creerDonneesDemo(ref: Date = new Date()): CapData {
  const s0 = weekStart(ref);
  const today = toIsoDate(ref);
  /** Lundi de la semaine S-k. */
  const wk = (k: number): IsoDate => addDays(s0, -7 * k);
  /** Jour `offset` (0 = lundi) de la semaine S-k. */
  const day = (k: number, offset: number): IsoDate => addDays(wk(k), offset);
  /** Ne garde que les jours déjà passés (semaine en cours). */
  const past = (d: IsoDate): boolean => d <= today;

  const start = wk(4);
  const createdAt = at(addDays(start, -1), 21); // dimanche soir avant S-4

  /* ---------------- Objectifs ---------------- */
  const goals: CapData['goals'] = [
    {
      id: DEMO_GOAL_RUN,
      title: 'Courir 10 km sans m’arrêter',
      icon: '🏃',
      smart: {
        specific: 'Courir 10 km d’une traite, à mon rythme',
        measurable: 'Plus longue sortie : 10 km',
        achievable: 'Je cours déjà 3 km, et j’ai 3 créneaux libres par semaine',
        relevant: 'Me sentir en forme et participer à la course du quartier',
        deadline: addDays(s0, 7 * 10),
      },
      context: {
        who: 'Moi, avec une amie le dimanche',
        where: 'Au parc près de chez moi',
        when: 'Mardi et jeudi soir, dimanche matin',
        how: 'Augmenter la plus longue sortie de 10 % par semaine',
        why: 'Retrouver de l’énergie',
      },
      status: 'active',
      createdAt,
    },
    {
      id: DEMO_GOAL_SAVE,
      title: 'Épargner 1 000 €',
      icon: '💶',
      smart: {
        specific: 'Mettre 1 000 € de côté sur mon livret',
        measurable: 'Solde du livret : 1 000 €',
        achievable: '50 € par semaine en réduisant les petites dépenses',
        relevant: 'Avoir un coussin de sécurité pour les imprévus',
        deadline: addDays(s0, 7 * 16),
      },
      status: 'active',
      createdAt,
    },
  ];

  /* ---------------- Semaines ---------------- */
  const weeks: Week[] = [];
  for (const goalId of [DEMO_GOAL_RUN, DEMO_GOAL_SAVE]) {
    for (let k = 4; k >= 0; k--) {
      weeks.push({ id: `${goalId}-w${k}`, goalId, weekStart: wk(k) });
    }
  }
  const weekId = (goalId: string, k: number) => `${goalId}-w${k}`;

  /* ---------------- Actions & réalisations ---------------- */
  const actions: PlannedAction[] = [];
  const actionLogs: ActionLog[] = [];
  let logSeq = 0;
  const addAction = (
    goalId: string,
    k: number,
    slug: string,
    label: string,
    targetCount: number,
    doneOffsets: number[],
    days?: number[],
  ) => {
    const id = `${goalId}-w${k}-${slug}`;
    actions.push({ id, goalId, weekId: weekId(goalId, k), label, targetCount, days, createdAt: at(addDays(wk(k), -1), 21) });
    for (const off of doneOffsets) {
      const date = day(k, off);
      if (!past(date)) continue;
      actionLogs.push({ id: `demo-log-${++logSeq}`, actionId: id, date, createdAt: at(date, 19, 30) });
    }
  };

  // Course : 3 sorties/semaine (mar, jeu, dim) + 2 séances d'étirements.
  const runDone: Record<number, number[]> = { 4: [1, 3, 6], 3: [1, 6], 2: [1, 3, 6], 1: [1, 3, 6], 0: [1, 3] };
  const stretchDone: Record<number, number[]> = { 4: [2], 3: [2, 5], 2: [2, 5], 1: [5], 0: [2] };
  for (let k = 4; k >= 0; k--) {
    addAction(DEMO_GOAL_RUN, k, 'sortie', 'Sortie course', 3, runDone[k], [2, 4, 7]);
    addAction(DEMO_GOAL_RUN, k, 'etirements', 'Étirements 10 min', 2, stretchDone[k]);
  }

  // Épargne : virement de 50 € + noter ses dépenses 3 fois.
  const transferDone: Record<number, number[]> = { 4: [0], 3: [0], 2: [], 1: [], 0: [0] };
  const notesDone: Record<number, number[]> = { 4: [1, 3, 6], 3: [2, 6], 2: [3], 1: [], 0: [1, 3] };
  for (let k = 4; k >= 1; k--) {
    addAction(DEMO_GOAL_SAVE, k, 'virement', 'Virement de 50 € vers le livret', 1, transferDone[k], [1]);
    addAction(DEMO_GOAL_SAVE, k, 'depenses', 'Noter mes dépenses du jour', 3, notesDone[k]);
  }
  // Semaine en cours : plan ajusté après l'analyse des causes.
  addAction(DEMO_GOAL_SAVE, 0, 'virement-auto', 'Programmer le virement automatique le jour de la paie', 1, transferDone[0], [1]);
  addAction(DEMO_GOAL_SAVE, 0, 'depenses', 'Noter mes dépenses (2 min, rappel à 21 h)', 3, notesDone[0]);
  addAction(DEMO_GOAL_SAVE, 0, 'imprevus', 'Créer une enveloppe « imprévus » de 20 €/semaine', 1, []);

  /* ---------------- Repères & mesures ---------------- */
  const markers: CapData['markers'] = [
    { id: 'demo-marker-distance', goalId: DEMO_GOAL_RUN, name: 'Plus longue sortie', unit: 'km', baseline: 3, target: 10, direction: 'up', aggregation: 'last', createdAt },
    { id: 'demo-marker-allure', goalId: DEMO_GOAL_RUN, name: 'Allure moyenne', unit: 'min/km', baseline: 7.5, target: 6.5, direction: 'down', aggregation: 'avg', createdAt },
    { id: 'demo-marker-livret', goalId: DEMO_GOAL_SAVE, name: 'Solde du livret', unit: '€', baseline: 0, target: 1000, direction: 'up', aggregation: 'last', createdAt },
    { id: 'demo-marker-plaisir', goalId: DEMO_GOAL_SAVE, name: 'Petites dépenses', unit: '€ / semaine', baseline: 120, target: 60, direction: 'down', aggregation: 'sum', createdAt },
  ];

  const measurements: Measurement[] = [];
  let mSeq = 0;
  const measure = (markerId: string, date: IsoDate, value: number) => {
    if (!past(date)) return;
    measurements.push({ id: `demo-m-${++mSeq}`, markerId, date, value, createdAt: at(date, 20, 15) });
  };
  // Distance de la plus longue sortie (le dimanche) et allure (après chaque sortie).
  const longRun: Record<number, number> = { 4: 3.5, 3: 4, 2: 4.8, 1: 5.5 };
  const pace: Record<number, [number, number]> = { 4: [7.6, 7.4], 3: [7.4, 7.3], 2: [7.2, 7.1], 1: [7.0, 6.9], 0: [6.9, 6.9] };
  for (let k = 4; k >= 0; k--) {
    if (longRun[k] != null) measure('demo-marker-distance', day(k, 6), longRun[k]);
    measure('demo-marker-allure', day(k, 1), pace[k][0]);
    measure('demo-marker-allure', day(k, 3), pace[k][1]);
  }
  // Livret : 50 €, 100 €, puis retrait de 30 € (réparation voiture), stable, puis reprise.
  measure('demo-marker-livret', day(4, 0), 50);
  measure('demo-marker-livret', day(3, 0), 100);
  measure('demo-marker-livret', day(2, 4), 70);
  measure('demo-marker-livret', day(1, 6), 70);
  measure('demo-marker-livret', day(0, 0), 120);
  // Petites dépenses notées au fil de la semaine (repère 'sum' : total hebdo).
  // Totaux : S-4 = 95 €, S-3 = 88 €, S-2 = 130 €, S-1 = 140 € (2 restos imprévus).
  const spending: Record<number, Array<[number, number]>> = {
    4: [[1, 12], [3, 38], [6, 45]],
    3: [[2, 30], [5, 58]],
    2: [[1, 15], [3, 65], [5, 50]],
    1: [[2, 42], [4, 55], [5, 43]],
    0: [[1, 9], [3, 14]],
  };
  for (let k = 4; k >= 0; k--) {
    for (const [off, value] of spending[k]) measure('demo-marker-plaisir', day(k, off), value);
  }

  /* ---------------- Bilans ---------------- */
  const review = (
    goalId: string,
    k: number,
    verdict: WeeklyReview['verdict'],
    whatWorked: string,
    whatBlocked: string,
    whatIChange: string,
  ): WeeklyReview => ({
    id: `${goalId}-review-w${k}`,
    goalId,
    weekId: weekId(goalId, k),
    weekStart: wk(k),
    whatWorked,
    whatBlocked,
    whatIChange,
    verdict,
    createdAt: at(day(k, 6), 21, 30),
  });

  const reviews: WeeklyReview[] = [
    review(DEMO_GOAL_RUN, 4, 'progress', 'Les 3 sorties faites, même sous la pluie.', 'Courbatures le mercredi.', 'Je m’étire après chaque sortie.'),
    review(DEMO_GOAL_RUN, 3, 'progress', 'La sortie du dimanche avec Léa, très motivante.', 'Réunion tardive jeudi : sortie sautée.', 'Je déplace la sortie du jeudi au matin si besoin.'),
    review(DEMO_GOAL_RUN, 2, 'progress', 'Presque 5 km d’un coup !', 'Rien de particulier.', 'J’ajoute 500 m à la sortie longue.'),
    review(DEMO_GOAL_RUN, 1, 'progress', '5,5 km et une allure qui s’améliore.', 'Un seul étirement.', 'Étirements juste après la douche, pas plus tard.'),
    review(DEMO_GOAL_SAVE, 4, 'progress', 'Le virement fait dès lundi.', 'Rien.', 'Je continue comme ça.'),
    review(DEMO_GOAL_SAVE, 3, 'progress', '100 € de côté, ça fait du bien.', 'J’ai oublié de noter mes dépenses un soir.', 'Je note le matin au café.'),
    review(DEMO_GOAL_SAVE, 2, 'stuck', 'J’ai quand même noté une journée.', 'Réparation de la voiture : j’ai dû reprendre 30 €.', 'Je refais le virement dès que possible.'),
    review(DEMO_GOAL_SAVE, 1, 'stuck', 'Pas grand-chose cette semaine.', 'Pas de virement, aucune dépense notée, deux restos imprévus.', 'Je veux comprendre pourquoi ça coince.'),
  ];

  /* ---------------- Creuser la cause ---------------- */
  const rootCauseAnalyses: CapData['rootCauseAnalyses'] = [
    {
      id: 'demo-rca-epargne',
      goalId: DEMO_GOAL_SAVE,
      reviewId: `${DEMO_GOAL_SAVE}-review-w1`,
      problem: 'Deux semaines sans virement vers le livret',
      whys: [
        'Parce que je n’ai pas fait le virement.',
        'Parce que je repoussais le moment de le faire.',
        'Parce que j’avais peur d’être à découvert après la réparation.',
        'Parce que je n’ai aucune marge prévue pour les imprévus.',
        'Parce que mon plan supposait des semaines « parfaites ».',
      ],
      causes: [
        { family: 'methode', label: 'Virement manuel, facile à repousser', weight: 5 },
        { family: 'moyens', label: 'Pas d’enveloppe pour les imprévus', weight: 4 },
        { family: 'moi', label: 'Je n’aime pas regarder mon compte', weight: 3 },
        { family: 'environnement', label: 'Sorties au resto avec les collègues', weight: 2 },
        { family: 'temps', label: 'Le soir je suis trop fatigué·e pour noter', weight: 1 },
      ],
      decision: 'Virement automatique le jour de la paie + 20 € par semaine pour les imprévus.',
      createdAt: at(day(1, 6), 21, 50),
    },
  ];

  /* ---------------- Carnet ---------------- */
  const lessons: CapData['lessons'] = [
    { id: 'demo-lesson-1', goalId: DEMO_GOAL_RUN, text: 'Courir à deux le dimanche rend la sortie longue presque facile.', createdAt: at(day(3, 6), 21, 40) },
  ];
  const recipes: CapData['recipes'] = [
    {
      id: 'demo-recipe-1',
      goalId: DEMO_GOAL_RUN,
      title: 'Ma sortie du dimanche',
      steps: ['Préparer ses affaires le samedi soir', 'Rendez-vous à 9 h avec Léa', 'Étirements dès le retour'],
      when: 'Chaque dimanche matin',
      createdAt: at(day(2, 6), 21, 40),
    },
  ];

  return { goals, weeks, actions, actionLogs, markers, measurements, reviews, rootCauseAnalyses, lessons, recipes };
}

/** Date de référence fixe pour les tests et captures d'écran reproductibles (un jeudi). */
export const DEMO_REF_DATE = new Date(2026, 10, 26, 12, 0); // jeudi 26 novembre 2026
