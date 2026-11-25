import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  actionCompletionRate,
  addDays,
  daysBetween,
  isIsoDate,
  lastWeekStarts,
  aggregateValues,
  linearSlope,
  markerCurrentValue,
  markerGoalProgress,
  markerProgress,
  markerTrend,
  markerWeeklySeries,
  pareto,
  paretoCauses,
  paretoFamilies,
  reviewStreak,
  shouldSuggestDigging,
  smartClarity,
  toIsoDate,
  weekEnd,
  weekStart,
  weeklySeries,
} from './calculs.ts';
import { creerDonneesDemo, DEMO_GOAL_RUN, DEMO_GOAL_SAVE, DEMO_REF_DATE } from './donnees-demo.ts';
import type { Cause, Marker, Measurement, PlannedAction, RootCauseAnalysis, WeeklyReview } from './types.ts';

const T = '2026-01-01T00:00:00.000Z';
const meas = (markerId: string, date: string, value: number, createdAt = T): Measurement => ({
  id: `${markerId}-${date}-${value}`, markerId, date, value, createdAt,
});
const rev = (weekStartDate: string, verdict: 'progress' | 'stuck', goalId = 'g'): WeeklyReview => ({
  id: `r-${weekStartDate}`, goalId, weekId: `w-${weekStartDate}`, weekStart: weekStartDate,
  whatWorked: '', whatBlocked: '', whatIChange: '', verdict, createdAt: `${addDays(weekStartDate, 6)}T20:00:00.000Z`,
});

describe('dates', () => {
  it('toIsoDate utilise le fuseau local', () => {
    assert.equal(toIsoDate(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
    assert.equal(toIsoDate(new Date(2026, 0, 5, 0, 1)), '2026-01-05');
  });
  it('isIsoDate rejette les dates impossibles', () => {
    assert.equal(isIsoDate('2026-02-29'), false);
    assert.equal(isIsoDate('2028-02-29'), true);
    assert.equal(isIsoDate('2026-1-05'), false);
    assert.equal(isIsoDate(undefined), false);
  });
  it('weekStart renvoie le lundi', () => {
    assert.equal(weekStart('2026-11-23'), '2026-11-23'); // lundi
    assert.equal(weekStart('2026-11-26'), '2026-11-23'); // jeudi
    assert.equal(weekStart('2026-11-29'), '2026-11-23'); // dimanche
    assert.equal(weekStart('2026-11-30'), '2026-11-30');
    assert.equal(weekStart(new Date(2026, 10, 29, 23, 30)), '2026-11-23');
  });
  it('weekStart traverse mois, année et changement d’heure', () => {
    assert.equal(weekStart('2027-01-01'), '2026-12-28');
    assert.equal(weekStart('2026-03-29'), '2026-03-23'); // passage à l'heure d'été (UE)
    assert.equal(weekStart('2026-10-25'), '2026-10-19'); // passage à l'heure d'hiver (UE)
    assert.equal(weekEnd('2026-12-30'), '2027-01-03');
  });
  it('addDays / daysBetween / lastWeekStarts', () => {
    assert.equal(addDays('2026-03-28', 2), '2026-03-30');
    assert.equal(daysBetween('2026-03-23', '2026-03-30'), 7);
    assert.deepEqual(lastWeekStarts('2026-11-26', 3), ['2026-11-09', '2026-11-16', '2026-11-23']);
  });
});

describe('actionCompletionRate', () => {
  const actions: PlannedAction[] = [
    { id: 'a', goalId: 'g', weekId: 'w', label: 'Courir', targetCount: 3, createdAt: T },
    { id: 'b', goalId: 'g', weekId: 'w', label: 'Étirer', targetCount: 1, createdAt: T },
  ];
  const log = (actionId: string, date: string) => ({ id: `${actionId}${date}`, actionId, date, createdAt: T });

  it('plafonne chaque action à sa cible', () => {
    const logs = [log('a', '2026-11-23'), log('a', '2026-11-24'), log('a', '2026-11-25'), log('a', '2026-11-26')];
    const r = actionCompletionRate(actions, logs);
    assert.deepEqual(r, { done: 3, planned: 4, rate: 0.75, actionsCompleted: 1 });
  });
  it('filtre par semaine', () => {
    const logs = [log('a', '2026-11-22'), log('a', '2026-11-23'), log('b', '2026-11-29'), log('b', '2026-11-30')];
    const r = actionCompletionRate(actions, logs, '2026-11-23');
    assert.equal(r.done, 2);
    assert.equal(r.rate, 0.5);
  });
  it('0 sans action prévue', () => {
    assert.equal(actionCompletionRate([], []).rate, 0);
  });
});

describe('markerProgress', () => {
  it('direction up', () => {
    const m = { baseline: 3, target: 10, direction: 'up' as const };
    assert.equal(markerProgress(m, 3), 0);
    assert.equal(markerProgress(m, 6.5), 50);
    assert.equal(markerProgress(m, 10), 100);
    assert.equal(markerProgress(m, 12), 100);
    assert.equal(markerProgress(m, 1), 0);
  });
  it('direction down', () => {
    const m = { baseline: 120, target: 60, direction: 'down' as const };
    assert.equal(markerProgress(m, 90), 50);
    assert.equal(markerProgress(m, 50), 100);
    assert.equal(markerProgress(m, 140), 0);
  });
  it('cas dégénérés', () => {
    assert.equal(markerProgress({ baseline: 5, target: 5, direction: 'up' }, 5), 100);
    assert.equal(markerProgress({ baseline: 5, target: 5, direction: 'up' }, 4), 0);
    assert.equal(markerProgress({ baseline: 0, target: 10, direction: 'up' }, null), 0);
    assert.equal(markerProgress({ baseline: 0, target: 10, direction: 'up' }, NaN), 0);
  });
});

describe('weeklySeries & markerTrend', () => {
  const ms = [
    meas('m', '2026-11-03', 4), meas('m', '2026-11-05', 6), // sem. 02/11 : moyenne 5
    // sem. 09/11 : aucune mesure
    meas('m', '2026-11-17', 7),
    meas('m', '2026-11-24', 8), meas('m', '2026-11-26', 10),
    meas('autre', '2026-11-24', 999),
  ];
  it('une entrée par semaine, trous à null', () => {
    const s = weeklySeries(ms, { ref: '2026-11-26', weeks: 4, markerId: 'm' });
    assert.deepEqual(s.map((p) => p.weekStart), ['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23']);
    assert.deepEqual(s.map((p) => p.value), [5, null, 7, 9]);
    assert.deepEqual(s.map((p) => p.count), [2, 0, 1, 2]);
  });
  it('agrégations last et sum', () => {
    const last = weeklySeries(ms, { ref: '2026-11-26', weeks: 1, markerId: 'm', aggregate: 'last' });
    assert.equal(last[0].value, 10);
    const sum = weeklySeries(ms, { ref: '2026-11-26', weeks: 1, markerId: 'm', aggregate: 'sum' });
    assert.equal(sum[0].value, 18);
  });
  it('linearSlope', () => {
    assert.equal(linearSlope([{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }]), 2);
    assert.equal(linearSlope([{ x: 0, y: 1 }]), null);
  });
  it('tendance orientée par la direction', () => {
    const up: Marker = { id: 'm', goalId: 'g', name: 'km', unit: 'km', baseline: 3, target: 10, direction: 'up', aggregation: 'avg', createdAt: T };
    const t = markerTrend(up, ms, '2026-11-26', 4);
    // points (0,5) (2,7) (3,9) → pente des moindres carrés = 9/7
    assert.ok(Math.abs(t.slopePerWeek! - 9 / 7) < 1e-9);
    assert.equal(t.label, 'better');
    assert.equal(markerTrend({ ...up, direction: 'down' }, ms, '2026-11-26', 4).label, 'worse');
  });
  it('tendance plate ou inconnue', () => {
    const m: Marker = { id: 'p', goalId: 'g', name: 'x', unit: '', baseline: 0, target: 100, direction: 'up', aggregation: 'avg', createdAt: T };
    const flat = [meas('p', '2026-11-17', 50), meas('p', '2026-11-24', 50.5)];
    assert.equal(markerTrend(m, flat, '2026-11-26', 4).label, 'flat');
    assert.equal(markerTrend(m, [meas('p', '2026-11-24', 1)], '2026-11-26', 4).label, 'unknown');
  });
});

describe('agrégation des repères (Marker.aggregation)', () => {
  const base = { goalId: 'g', name: 'x', unit: '', createdAt: T } as const;
  const sumM: Marker = { ...base, id: 's', baseline: 120, target: 60, direction: 'down', aggregation: 'sum' };
  const avgM: Marker = { ...base, id: 'a', baseline: 7.5, target: 6.5, direction: 'down', aggregation: 'avg' };
  const lastM: Marker = { ...base, id: 'l', baseline: 0, target: 1000, direction: 'up', aggregation: 'last' };
  const ms = [
    // sem. 09/11
    meas('s', '2026-11-10', 40), meas('s', '2026-11-12', 50),
    meas('a', '2026-11-10', 7.4), meas('a', '2026-11-12', 7.2),
    meas('l', '2026-11-10', 100), meas('l', '2026-11-12', 150),
    // sem. 16/11
    meas('s', '2026-11-17', 30), meas('s', '2026-11-19', 30), meas('s', '2026-11-21', 30),
    meas('a', '2026-11-17', 7.0), meas('a', '2026-11-19', 6.8),
    meas('l', '2026-11-21', 120), meas('l', '2026-11-17', 200),
    // sem. 23/11 (en cours)
    meas('s', '2026-11-24', 10),
  ];

  it('aggregateValues', () => {
    const items = [meas('x', '2026-11-24', 2, '2026-11-24T08:00:00Z'), meas('x', '2026-11-24', 4, '2026-11-24T20:00:00Z')];
    assert.equal(aggregateValues(items, 'sum'), 6);
    assert.equal(aggregateValues(items, 'avg'), 3);
    assert.equal(aggregateValues(items, 'last'), 4); // même jour : le plus récent createdAt
    assert.equal(aggregateValues([], 'sum'), null);
  });

  it('série hebdomadaire selon le repère', () => {
    assert.deepEqual(markerWeeklySeries(sumM, ms, '2026-11-26', 3).map((p) => p.value), [90, 90, 10]);
    const avg = markerWeeklySeries(avgM, ms, '2026-11-26', 3).map((p) => p.value);
    assert.ok(Math.abs(avg[0]! - 7.3) < 1e-9 && Math.abs(avg[1]! - 6.9) < 1e-9 && avg[2] === null);
    // 'last' = date la plus récente, pas l'ordre de saisie
    assert.deepEqual(markerWeeklySeries(lastM, ms, '2026-11-26', 3).map((p) => p.value), [150, 120, null]);
  });

  it('valeur actuelle et progression', () => {
    assert.deepEqual(markerCurrentValue(sumM, ms, '2026-11-26'), { value: 10, weekStart: '2026-11-23', inProgress: true });
    assert.deepEqual(markerCurrentValue(sumM, ms, '2026-11-20'), { value: 90, weekStart: '2026-11-16', inProgress: true });
    assert.deepEqual(markerCurrentValue(avgM, ms, '2026-11-26'), { value: 6.9, weekStart: '2026-11-16', inProgress: false });
    assert.equal(markerCurrentValue(lastM, ms).value, 120);
    assert.deepEqual(markerCurrentValue(lastM, []), { value: null, weekStart: null, inProgress: false });
    // sum, down : 90 € sur la semaine du 16/11 → (120-90)/(120-60) = 50 %
    assert.equal(markerGoalProgress(sumM, ms, '2026-11-22'), 50);
    // avg, down : 6.9 → (7.5-6.9)/(1) = 60 %
    assert.ok(Math.abs(markerGoalProgress(avgM, ms, '2026-11-26') - 60) < 1e-9);
    // last, up : 120 / 1000 = 12 %
    assert.ok(Math.abs(markerGoalProgress(lastM, ms, '2026-11-26') - 12) < 1e-9);
  });

  it('tendance : la semaine en cours est exclue pour un total hebdo', () => {
    // sum : 90, 90 (10 en cours ignoré) → plat ; sinon on verrait une fausse amélioration
    const t = markerTrend(sumM, ms, '2026-11-26', 3);
    assert.equal(t.slopePerWeek, 0);
    assert.equal(t.label, 'flat');
    assert.equal(t.points[2].value, 10); // le point reste dans la série du graphique
    // le même repère en 'avg' prend la semaine en cours : 30, 30, 10 → baisse = mieux (direction down)
    assert.equal(markerTrend({ ...sumM, aggregation: 'avg' }, ms, '2026-11-26', 3).label, 'better');
    assert.equal(markerTrend(avgM, ms, '2026-11-26', 3).label, 'better');
  });
});

describe('shouldSuggestDigging', () => {
  it('propose après 2 semaines bloquées consécutives', () => {
    const r = shouldSuggestDigging('g', [rev('2026-11-09', 'progress'), rev('2026-11-16', 'stuck'), rev('2026-11-23', 'stuck')]);
    assert.equal(r.suggest, true);
    assert.equal(r.stuckStreak, 2);
  });
  it('ne propose pas pour une seule semaine bloquée', () => {
    const r = shouldSuggestDigging('g', [rev('2026-11-16', 'progress'), rev('2026-11-23', 'stuck')]);
    assert.equal(r.suggest, false);
    assert.equal(r.stuckStreak, 1);
  });
  it('un trou entre deux semaines casse la série', () => {
    const r = shouldSuggestDigging('g', [rev('2026-11-09', 'stuck'), rev('2026-11-23', 'stuck')]);
    assert.equal(r.suggest, false);
  });
  it('le dernier bilan en progrès annule', () => {
    const r = shouldSuggestDigging('g', [rev('2026-11-09', 'stuck'), rev('2026-11-16', 'stuck'), rev('2026-11-23', 'progress')]);
    assert.equal(r.suggest, false);
    assert.equal(r.stuckStreak, 0);
  });
  it('ignore les autres objectifs et ne repropose pas après une analyse', () => {
    const reviews = [rev('2026-11-16', 'stuck'), rev('2026-11-23', 'stuck'), rev('2026-11-23', 'progress', 'autre')];
    const analysis: RootCauseAnalysis = { id: 'x', goalId: 'g', problem: '', whys: [], causes: [], createdAt: '2026-11-29T21:00:00' };
    assert.equal(shouldSuggestDigging('g', reviews).suggest, true);
    assert.equal(shouldSuggestDigging('g', reviews, [analysis]).suggest, false);
    const old = { ...analysis, createdAt: '2026-10-01T10:00:00' };
    assert.equal(shouldSuggestDigging('g', reviews, [old]).suggest, true);
  });
  it('aucun bilan', () => {
    assert.deepEqual(shouldSuggestDigging('g', []), { suggest: false, stuckStreak: 0 });
  });
});

describe('pareto', () => {
  const causes: Cause[] = [
    { family: 'temps', label: 'Fatigue le soir', weight: 1 },
    { family: 'methode', label: 'Virement manuel', weight: 5 },
    { family: 'moyens', label: 'Pas de marge', weight: 4 },
    { family: 'moi', label: 'Évitement', weight: 3 },
    { family: 'environnement', label: 'Restos', weight: 2 },
  ];
  it('trie, calcule les parts et sélectionne ~80 %', () => {
    const r = paretoCauses(causes);
    assert.equal(r.total, 15);
    assert.deepEqual(r.items.map((i) => i.item.label), ['Virement manuel', 'Pas de marge', 'Évitement', 'Restos', 'Fatigue le soir']);
    assert.deepEqual(r.items.map((i) => Math.round(i.cumulativeShare * 100)), [33, 60, 80, 93, 100]);
    assert.deepEqual(r.selected.map((c) => c.label), ['Virement manuel', 'Pas de marge', 'Évitement']);
  });
  it('inclut la cause qui franchit le seuil', () => {
    const r = pareto([{ w: 6 }, { w: 3 }, { w: 1 }], (x) => x.w);
    assert.deepEqual(r.selected.map((x) => x.w), [6, 3]);
  });
  it('une cause dominante suffit', () => {
    const r = pareto([{ w: 9 }, { w: 1 }], (x) => x.w);
    assert.deepEqual(r.selected.map((x) => x.w), [9]);
  });
  it('ignore les poids nuls/négatifs, tri stable en cas d’égalité', () => {
    const r = pareto([{ n: 'a', w: 2 }, { n: 'z', w: 0 }, { n: 'b', w: 2 }, { n: 'c', w: -1 }], (x) => x.w);
    assert.deepEqual(r.items.map((i) => i.item.n), ['a', 'b']);
    assert.equal(pareto([], () => 1).selected.length, 0);
  });
  it('par famille', () => {
    const r = paretoFamilies([...causes, { family: 'temps', label: 'Horaires', weight: 4 }]);
    assert.equal(r.items[0].item.family, 'temps'); // 1 + 4 = 5, égalité avec méthode mais vue en premier
    assert.equal(r.total, 19);
  });
});

describe('reviewStreak', () => {
  it('compte les semaines consécutives', () => {
    const reviews = [rev('2026-11-02', 'stuck'), rev('2026-11-09', 'progress'), rev('2026-11-16', 'stuck'), rev('2026-11-23', 'progress')];
    assert.equal(reviewStreak(reviews, '2026-11-26'), 4);
  });
  it('la semaine en cours sans bilan ne casse pas la série', () => {
    const reviews = [rev('2026-11-09', 'progress'), rev('2026-11-16', 'progress')];
    assert.equal(reviewStreak(reviews, '2026-11-26'), 2);
  });
  it('un trou remet à zéro', () => {
    assert.equal(reviewStreak([rev('2026-11-02', 'progress')], '2026-11-26'), 0);
    assert.equal(reviewStreak([rev('2026-11-02', 'progress'), rev('2026-11-23', 'progress')], '2026-11-26'), 1);
  });
  it('plusieurs bilans la même semaine comptent une fois', () => {
    assert.equal(reviewStreak([rev('2026-11-23', 'progress'), rev('2026-11-23', 'stuck', 'h')], '2026-11-26'), 1);
  });
});

describe('smartClarity', () => {
  it('objectif complet = 100', () => {
    const r = smartClarity({
      title: 'Courir 10 km',
      createdAt: '2026-11-01T10:00:00.000Z',
      smart: { specific: 'Courir 10 km sans pause', measurable: '10 km', achievable: 'oui', relevant: 'santé', deadline: '2027-03-01' },
    });
    assert.equal(r.score, 100);
    assert.deepEqual(r.missing, []);
  });
  it('liste ce qui manque avec des questions d’aide', () => {
    const r = smartClarity({ title: 'Épargner', createdAt: '2026-11-01T10:00:00.000Z', smart: { measurable: 'beaucoup' } });
    assert.equal(r.score, 0);
    assert.deepEqual(r.missing, ['specific', 'measurable', 'achievable', 'relevant', 'timeBound']);
    assert.equal(r.hints.length, 5);
  });
  it('un repère rend l’objectif mesurable ; échéance passée refusée', () => {
    const r = smartClarity({ title: 'Lire plus de livres', createdAt: '2026-11-01T10:00:00.000Z', smart: { deadline: '2026-10-01' } }, 1);
    assert.deepEqual(r.met, ['specific', 'measurable']);
    assert.ok(r.missing.includes('timeBound'));
    assert.equal(r.score, 40);
  });
});

describe('données de démo', () => {
  const d = creerDonneesDemo(DEMO_REF_DATE);
  it('2 objectifs, 4 semaines bilanées chacun', () => {
    assert.equal(d.goals.length, 2);
    for (const g of d.goals) assert.equal(d.reviews.filter((r) => r.goalId === g.id).length, 4);
    assert.equal(reviewStreak(d.reviews.filter((r) => r.goalId === DEMO_GOAL_RUN), DEMO_REF_DATE), 4);
  });
  it('références cohérentes', () => {
    const ids = (xs: { id: string }[]) => new Set(xs.map((x) => x.id));
    const goals = ids(d.goals), weeks = ids(d.weeks), actions = ids(d.actions), markers = ids(d.markers);
    assert.ok(d.weeks.every((w) => goals.has(w.goalId) && weekStart(w.weekStart) === w.weekStart));
    assert.ok(d.actions.every((a) => goals.has(a.goalId) && weeks.has(a.weekId)));
    assert.ok(d.actionLogs.every((l) => actions.has(l.actionId) && l.date <= toIsoDate(DEMO_REF_DATE)));
    assert.ok(d.measurements.every((m) => markers.has(m.markerId)));
    assert.ok(d.reviews.every((r) => weeks.has(r.weekId)));
    for (const k of ['actions', 'actionLogs', 'measurements', 'reviews'] as const) {
      assert.equal(ids(d[k]).size, d[k].length, `ids uniques : ${k}`);
    }
  });
  it('épargne : 2 semaines bloquées, déjà creusées', () => {
    const r = shouldSuggestDigging(DEMO_GOAL_SAVE, d.reviews);
    assert.equal(r.stuckStreak, 2);
    assert.equal(r.suggest, true);
    assert.equal(shouldSuggestDigging(DEMO_GOAL_SAVE, d.reviews, d.rootCauseAnalyses).suggest, false);
    const p = paretoCauses(d.rootCauseAnalyses[0].causes);
    assert.equal(p.selected.length, 3);
  });
  it('course : progression et tendance', () => {
    const distance = d.markers.find((m) => m.id === 'demo-marker-distance')!;
    const series = markerWeeklySeries(distance, d.measurements, DEMO_REF_DATE, 5);
    assert.deepEqual(series.map((p) => p.value), [3.5, 4, 4.8, 5.5, null]);
    assert.equal(Math.round(markerProgress(distance, 5.5)), 36);
    const allure = d.markers.find((m) => m.id === 'demo-marker-allure')!;
    assert.equal(markerTrend(allure, d.measurements, DEMO_REF_DATE, 5).label, 'better');
  });
  it('épargne : petites dépenses en total hebdo, solde en dernière valeur', () => {
    const plaisir = d.markers.find((m) => m.id === 'demo-marker-plaisir')!;
    assert.equal(plaisir.aggregation, 'sum');
    assert.deepEqual(markerWeeklySeries(plaisir, d.measurements, DEMO_REF_DATE, 5).map((p) => p.value), [95, 88, 130, 140, 23]);
    assert.equal(markerTrend(plaisir, d.measurements, DEMO_REF_DATE, 5).label, 'worse');
    const livret = d.markers.find((m) => m.id === 'demo-marker-livret')!;
    assert.equal(markerGoalProgress(livret, d.measurements, DEMO_REF_DATE), 12);
    assert.ok(d.markers.every((m) => ['sum', 'avg', 'last'].includes(m.aggregation)));
  });
  it('taux de réalisation de la semaine S-1', () => {
    const w1 = d.weeks.find((w) => w.goalId === DEMO_GOAL_RUN && w.weekStart === addDays(weekStart(DEMO_REF_DATE), -7))!;
    const r = actionCompletionRate(d.actions.filter((a) => a.weekId === w1.id), d.actionLogs, w1.weekStart);
    assert.deepEqual([r.done, r.planned], [4, 5]);
  });
});
