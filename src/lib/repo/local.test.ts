import { test } from "node:test";
import assert from "node:assert/strict";
import { LocalRepository, STORAGE_KEY, type StorageLike } from "./local.ts";

function fakeStorage(): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

test("CRUD complet sur les objectifs", async () => {
  const repo = new LocalRepository({ storage: fakeStorage() });
  assert.deepEqual(await repo.objectifs.list(), []);

  const o = await repo.objectifs.create({ titre: "Courir 5 km", description: null, statut: "actif" });
  assert.ok(o.id);
  assert.equal((await repo.objectifs.get(o.id))?.titre, "Courir 5 km");

  const maj = await repo.objectifs.update(o.id, { statut: "atteint" });
  assert.equal(maj.statut, "atteint");
  assert.equal(maj.createdAt, o.createdAt);

  await repo.objectifs.remove(o.id);
  assert.equal(await repo.objectifs.get(o.id), null);
});

test("les données sont versionnées et persistées", async () => {
  const storage = fakeStorage();
  await new LocalRepository({ storage }).objectifs.create({ titre: "Lire", description: "1 livre/mois", statut: "actif" });
  const stored = JSON.parse(storage.map.get(STORAGE_KEY) ?? "{}");
  assert.equal(stored.version, 1);
  assert.equal((await new LocalRepository({ storage }).objectifs.list()).length, 1);
});

test("données corrompues : sauvegarde du brut et repli à vide", async () => {
  const storage = fakeStorage();
  storage.setItem(STORAGE_KEY, "{pas du json");
  const repo = new LocalRepository({ storage, now: () => new Date(0) });
  assert.deepEqual(await repo.objectifs.list(), []);
  assert.equal(storage.map.get(`${STORAGE_KEY}:corrompu:0`), "{pas du json");
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
  assert.deepEqual(await repo.objectifs.list(), []);
  await assert.rejects(repo.objectifs.create({ titre: "x", description: null, statut: "actif" }), /Impossible d'enregistrer/);
});

test("mise à jour d'un objectif inexistant", async () => {
  const repo = new LocalRepository({ storage: fakeStorage() });
  await assert.rejects(repo.objectifs.update("nope", { titre: "x" }), { name: "NotFoundError" });
});
