import { test } from "node:test";
import assert from "node:assert/strict";
import { LocalRepository, STORAGE_KEY, type StorageLike } from "./local.ts";
import { creerDonneesDemo, DEMO_REF_DATE, DEMO_GOAL_SAVE } from "../domain/donnees-demo.ts";
import { actionCompletionRate, shouldSuggestDigging, weekStart } from "../domain/calculs.ts";

function fakeStorage(): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    get length() {
      return map.size;
    },
    key: (i) => [...map.keys()][i] ?? null,
  };
}

const goalInput = { title: "Courir 5 km", smart: { deadline: "2027-03-01" }, status: "active" as const };

test("objectifs : création, modification, suppression en cascade", async () => {
  const repo = new LocalRepository({ storage: fakeStorage() });
  const g = await repo.createGoal(goalInput);
  assert.ok(g.id);
  const updated = await repo.updateGoal(g.id, { status: "achieved", achievedAt: new Date().toISOString() });
  assert.equal(updated.status, "achieved");
  const back = await repo.updateGoal(g.id, { status: "active" });
  assert.equal(back.achievedAt, undefined);

  const [a] = await repo.saveWeekPlan(g.id, "2026-11-23", [{ label: "Sortie", targetCount: 3 }]);
  await repo.addActionLog(a.id, "2026-11-24");
  const [m] = await repo.saveMarkers(g.id, [
    { name: "Distance", unit: "km", baseline: 2, target: 5, direction: "up", aggregation: "last" },
  ]);
  await repo.addMeasurement({ markerId: m.id, date: "2026-11-24", value: 3.456 });
  await repo.createLessons(g.id, ["Partir doucement"]);

  let data = await repo.load();
  assert.equal(data.measurements[0].value, 3.46);
  await repo.deleteGoal(g.id);
  data = await repo.load();
  assert.equal(data.goals.length + data.weeks.length + data.actions.length + data.actionLogs.length, 0);
  assert.equal(data.markers.length + data.measurements.length, 0);
  assert.equal(data.lessons.length, 1, "les leçons survivent");
});

test("plan : mise à jour, ajout et retrait d'actions ; une coche par jour", async () => {
  const repo = new LocalRepository({ storage: fakeStorage() });
  const g = await repo.createGoal(goalInput);
  const [a, b] = await repo.saveWeekPlan(g.id, "2026-11-23", [
    { label: "A", targetCount: 1 },
    { label: "B", targetCount: 2, days: [1, 3] },
  ]);
  await repo.addActionLog(b.id, "2026-11-25");
  await repo.addActionLog(b.id, "2026-11-25");
  const plan = await repo.saveWeekPlan(g.id, "2026-11-23", [{ id: a.id, label: "A bis", targetCount: 2 }]);
  const data = await repo.load();
  assert.equal(plan[0].id, a.id);
  assert.equal(data.actions.length, 1);
  assert.equal(data.actions[0].label, "A bis");
  assert.equal(data.actionLogs.length, 0, "coches de l'action retirée supprimées");
  assert.equal(data.weeks.length, 1);
});

test("bilan : un seul par semaine (remplacé)", async () => {
  const repo = new LocalRepository({ storage: fakeStorage() });
  const g = await repo.createGoal(goalInput);
  const base = { goalId: g.id, weekStart: "2026-11-23", whatWorked: "", whatBlocked: "", whatIChange: "Rien" };
  const r1 = await repo.saveReview({ ...base, verdict: "stuck" });
  const r2 = await repo.saveReview({ ...base, verdict: "progress" });
  const data = await repo.load();
  assert.equal(data.reviews.length, 1);
  assert.equal(r1.id, r2.id);
  assert.equal(data.reviews[0].verdict, "progress");
});

test("validation zod : refuse titres vides, trop longs, caractères de contrôle et champs inconnus", async () => {
  const repo = new LocalRepository({ storage: fakeStorage() });
  await assert.rejects(repo.createGoal({ ...goalInput, title: "   " }), { name: "InvalidInputError" });
  await assert.rejects(repo.createGoal({ ...goalInput, title: "x".repeat(121) }), { name: "InvalidInputError" });
  await assert.rejects(repo.createGoal({ ...goalInput, title: "a\u0007b" }), { name: "InvalidInputError" });
  await assert.rejects(
    repo.createGoal({ ...goalInput, user_id: "pirate" } as unknown as typeof goalInput),
    { name: "InvalidInputError" },
  );
  const g = await repo.createGoal({ ...goalInput, title: "  Lire  " });
  assert.equal(g.title, "Lire");
});

test("exemples : creerDonneesDemo passe la validation et les calculs fonctionnent dessus", async () => {
  const storage = fakeStorage();
  const repo = new LocalRepository({ storage });
  await repo.replaceAll(creerDonneesDemo(DEMO_REF_DATE));
  const data = await new LocalRepository({ storage }).load();
  assert.equal(data.goals.length, 2);
  const s1 = weekStart(new Date(2026, 10, 19));
  const actions = data.actions.filter((a) => a.goalId === DEMO_GOAL_SAVE && data.weeks.find((w) => w.id === a.weekId)?.weekStart === s1);
  assert.ok(actionCompletionRate(actions, data.actionLogs, s1).planned > 0);
  assert.equal(shouldSuggestDigging(DEMO_GOAL_SAVE, data.reviews, data.rootCauseAnalyses).suggest, false);
  const stored = JSON.parse(storage.map.get(STORAGE_KEY) ?? "{}");
  assert.equal(stored.version, 1);
});

test("données corrompues ou altérées : brut sauvegardé, repli à vide", async () => {
  const storage = fakeStorage();
  storage.setItem(STORAGE_KEY, "{pas du json");
  const repo = new LocalRepository({ storage, now: () => new Date(0) });
  assert.deepEqual((await repo.load()).goals, []);
  assert.equal(repo.lastReadStatus, "corrupted");
  assert.equal(storage.map.get(`${STORAGE_KEY}:corrompu:0`), "{pas du json");

  const altered = { version: 1, data: { ...creerDonneesDemo(DEMO_REF_DATE), intrus: true } };
  storage.setItem(STORAGE_KEY, JSON.stringify(altered));
  assert.deepEqual((await repo.load()).goals, []);
});

test("stockage qui lève une exception : lecture vide, écriture en erreur explicite", async () => {
  const broken: StorageLike = {
    getItem: () => {
      throw new Error("bloqué");
    },
    setItem: () => {
      throw new Error("plein");
    },
    removeItem: () => {},
  };
  const repo = new LocalRepository({ storage: broken });
  assert.deepEqual((await repo.load()).goals, []);
  await assert.rejects(repo.createGoal(goalInput), /Impossible d'enregistrer/);
});

test("effacement : supprime toutes les clés cap:* et rien d'autre", async () => {
  const storage = fakeStorage();
  const repo = new LocalRepository({ storage });
  await repo.createGoal(goalInput);
  storage.setItem("cap:v1:prefs", "{}");
  storage.setItem("autre", "garde");
  await repo.clear();
  assert.deepEqual([...storage.map.keys()], ["autre"]);
});

test("mise à jour d'un objectif inexistant", async () => {
  const repo = new LocalRepository({ storage: fakeStorage() });
  await assert.rejects(repo.updateGoal("nope", { title: "x" }), { name: "NotFoundError" });
});
