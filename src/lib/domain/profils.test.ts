import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CAUSE_FAMILIES } from './types.ts';
import {
  PROFILS,
  detecterProfil,
  fusionnerSansDoublons,
  normaliser,
  premierNombre,
  profilDeObjectif,
  profilParId,
} from './profils.ts';

describe('detecterProfil', () => {
  const cas: [string, string][] = [
    ['Courir un semi en avril', 'sport'],
    ['Courir 10 km sans m’arrêter', 'sport'],
    ['Aller à la salle de sport 3 fois par semaine', 'sport'],
    ['Mettre 200 € de côté par mois', 'argent'],
    ['Économiser 1 000€ pour les vacances', 'argent'],
    ['Arrêter de fumer', 'habitude'],
    ['Moins de 1 h d’écran par jour', 'habitude'],
    ['Lire un livre par mois', 'lecture'],
    ['Lire 12 livres cette année', 'lecture'],
    ['Me coucher avant 23 h', 'sommeil'],
    ['Dormir 8 heures par nuit', 'sommeil'],
    ['Parler anglais couramment', 'apprentissage'],
    ['Perdre 5 kg', 'alimentation'],
    ['Manger plus de légumes', 'alimentation'],
    ['Méditer 10 minutes par jour', 'bienetre'],
    ['Être moins stressé au travail', 'bienetre'],
    ['Ranger tout l’appartement', 'maison'],
    ['Appeler mes parents chaque semaine', 'relations'],
    ['Lancer mon projet de site en freelance', 'travail'],
    ['Apprendre la guitare', 'apprentissage'],
  ];
  for (const [phrase, attendu] of cas) {
    it(`« ${phrase} » → ${attendu}`, () => {
      assert.equal(detecterProfil(phrase).id, attendu);
    });
  }

  it('renvoie « autre » si rien ne ressort', () => {
    assert.equal(detecterProfil('Être heureux').id, 'autre');
    assert.equal(detecterProfil('').id, 'autre');
  });

  it('insensible à la casse et aux accents', () => {
    assert.equal(detecterProfil('ÉPARGNER').id, 'argent');
    assert.equal(detecterProfil('mediter').id, 'bienetre');
  });
});

describe('contenu des profils', () => {
  it('ids uniques et contenu complet', () => {
    assert.equal(new Set(PROFILS.map((p) => p.id)).size, PROFILS.length);
    for (const p of PROFILS) {
      assert.equal(p.raisons.length, 4, p.id);
      assert.ok(p.reperes.length >= 2 && p.reperes.length <= 3, p.id);
      assert.ok(p.actions.length === 6, p.id);
      assert.ok(p.exemplesComment.length >= 3, p.id);
      if (p.id !== 'autre') {
        assert.equal(p.causes.length, 5, p.id);
        assert.deepEqual(new Set(p.causes.map((c) => c.famille)), new Set(CAUSE_FAMILIES), p.id);
      }
      for (const m of p.motsCles) assert.equal(normaliser(m).trim(), m, `${p.id} : ${m}`);
    }
  });
});

describe('outils', () => {
  it('profilDeObjectif préfère le profil stocké, sinon recalcule', () => {
    assert.equal(profilDeObjectif({ title: 'Lire plus', profil: 'sport' }).id, 'sport');
    assert.equal(profilDeObjectif({ title: 'Lire plus' }).id, 'lecture');
    assert.equal(profilDeObjectif({ title: 'Lire plus', profil: 'inconnu' }).id, 'lecture');
    assert.equal(profilParId('inconnu'), undefined);
  });

  it('fusionnerSansDoublons ignore casse et accents', () => {
    assert.deepEqual(fusionnerSansDoublons(['Lire 20 pages'], ['lire 20 pages', 'Méditer'], ['mediter']), ['Lire 20 pages', 'Méditer']);
  });

  it('premierNombre', () => {
    assert.equal(premierNombre('Lire 12 livres'), 12);
    assert.equal(premierNombre('Économiser 1 000 €'), 1000);
    assert.equal(premierNombre('Perdre 2,5 kg'), 2.5);
    assert.equal(premierNombre('Arrêter de fumer'), null);
  });
});
