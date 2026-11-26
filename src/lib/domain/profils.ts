/**
 * Profils d'objectif : contenus d'aide adaptés au type d'objectif
 * (raisons, repères, unités, idées d'actions, causes de blocage fréquentes).
 *
 * TS pur, sans dépendance au navigateur : testé avec node:test.
 * Le profil est détecté à partir du texte de l'objectif (mots-clés et racines,
 * insensible à la casse et aux accents). L'id choisi peut être stocké dans
 * `Goal.profil` ; s'il manque (anciennes données, Supabase), on le recalcule.
 */
import type { CauseFamily, MarkerAggregation, MarkerDirection } from './types.ts';

export type ProfilId =
  | 'sport'
  | 'argent'
  | 'lecture'
  | 'sommeil'
  | 'alimentation'
  | 'apprentissage'
  | 'travail'
  | 'relations'
  | 'habitude'
  | 'bienetre'
  | 'maison'
  | 'autre';

export interface RepereSuggere {
  nom: string;
  unite: string;
  sens: MarkerDirection;
  regroupement: MarkerAggregation;
  /** Cible d'exemple (sert de placeholder ou de valeur proposée). */
  cible: number;
  depart?: number;
}

export interface CauseSuggeree {
  famille: CauseFamily;
  label: string;
}

export interface Profil {
  id: ProfilId;
  libelle: string;
  /** Mots-clés ou racines, déjà sans accents, en minuscules. Une racine matche le début d'un mot. */
  motsCles: string[];
  raisons: string[];
  /** Le premier est le repère principal proposé dans l'assistant. */
  reperes: RepereSuggere[];
  unites: string[];
  exemplesComment: string[];
  lieux: string[];
  actions: string[];
  causes: CauseSuggeree[];
  placeholderAction: string;
  /** Exemple de « ce qui coince » (Creuser la cause). */
  exempleBlocage: string;
}

export const PROFILS: readonly Profil[] = [
  {
    id: 'sport',
    libelle: 'Sport',
    motsCles: [
      'cour', 'couri', 'courr', 'course', 'jogg', 'running', 'semi', 'marathon', 'trail', 'km', 'sport', 'muscu',
      'muscl', 'natation', 'nager', 'piscine', 'velo', 'fitness', 'gym', 'salle de sport', 'pompes', 'abdos',
      'squat', 'randonn', 'rando', 'marcher', 'marche', '000 pas', 'foot', 'tennis', 'basket', 'triathlon',
      'entrain', 'etirement', 'souplesse', 'escalade', 'boxe', 'danse',
    ],
    raisons: ['Me sentir en forme', 'Avoir plus d’énergie', 'Prendre soin de ma santé', 'Me prouver que j’en suis capable'],
    reperes: [
      { nom: 'Plus longue sortie', unite: 'km', sens: 'up', regroupement: 'last', cible: 10, depart: 0 },
      { nom: 'Séances de la semaine', unite: 'séances', sens: 'up', regroupement: 'sum', cible: 3, depart: 0 },
      { nom: 'Distance de la semaine', unite: 'km', sens: 'up', regroupement: 'sum', cible: 15, depart: 0 },
    ],
    unites: ['km', 'séances', 'minutes', 'pas'],
    exemplesComment: [
      '3 sorties par semaine, en partant doucement',
      'Suivre un programme débutant',
      'Une séance courte le matin avant le travail',
      'Rejoindre un club ou un groupe',
    ],
    lieux: ['Au parc', 'Dehors', 'À la salle', 'À la maison'],
    actions: [
      'Courir 20 minutes',
      'Faire une séance de 30 minutes',
      'Marcher 30 minutes',
      'Préparer mes affaires de sport la veille',
      'Faire 10 minutes d’étirements',
      'Caler mes séances dans l’agenda',
    ],
    causes: [
      { famille: 'moi', label: 'Courbatures ou petite douleur' },
      { famille: 'temps', label: 'Pas de créneau pour la séance' },
      { famille: 'environnement', label: 'Il fait nuit ou il pleut' },
      { famille: 'moyens', label: 'Pas les bonnes chaussures' },
      { famille: 'methode', label: 'J’ai voulu aller trop vite' },
    ],
    placeholderAction: 'Ex. : courir 20 minutes',
    exempleBlocage: 'Ex. : je ne sors pas courir le soir',
  },
  {
    id: 'argent',
    libelle: 'Argent',
    motsCles: [
      'epargn', 'econom', '€', 'euro', 'argent', 'budget', 'depens', 'dette', 'credit', 'livret', 'de cote',
      'salaire', 'invest', 'rembours', 'compte', 'banque', 'achat', 'acheter', 'apport', 'tirelire', 'finance',
    ],
    raisons: ['Être serein·e côté argent', 'Préparer un projet qui me tient à cœur', 'Avoir un coussin en cas d’imprévu', 'Arrêter de stresser en fin de mois'],
    reperes: [
      { nom: 'Montant mis de côté', unite: '€', sens: 'up', regroupement: 'last', cible: 1000, depart: 0 },
      { nom: 'Petites dépenses de la semaine', unite: '€', sens: 'down', regroupement: 'sum', cible: 50 },
      { nom: 'Jours sans dépense', unite: 'jours', sens: 'up', regroupement: 'sum', cible: 3, depart: 0 },
    ],
    unites: ['€', '€ / mois', '€ / semaine', 'jours'],
    exemplesComment: [
      'Un virement automatique le jour de la paie',
      'Noter mes dépenses chaque soir',
      'Une liste avant chaque course',
      'Revoir mes abonnements',
    ],
    lieux: ['À la maison', 'En ligne', 'Sur l’appli de ma banque', 'En faisant les courses'],
    actions: [
      'Mettre en place un virement automatique',
      'Noter mes dépenses du jour',
      'Faire une liste avant les courses',
      'Résilier un abonnement inutile',
      'Faire le point sur mon compte',
      'Passer une journée sans dépense',
    ],
    causes: [
      { famille: 'moi', label: 'Achats pour me faire plaisir' },
      { famille: 'temps', label: 'Pas le temps de suivre mes comptes' },
      { famille: 'environnement', label: 'Sorties et invitations' },
      { famille: 'moyens', label: 'Dépenses imprévues' },
      { famille: 'methode', label: 'Pas de virement automatique' },
    ],
    placeholderAction: 'Ex. : noter mes dépenses du jour',
    exempleBlocage: 'Ex. : je dépense tout avant la fin du mois',
  },
  {
    id: 'lecture',
    libelle: 'Lecture',
    motsCles: ['livre', 'lir', 'lis', 'lecture', 'roman', 'bouquin', 'page', 'bd', 'manga', 'liseuse', 'bibliotheque', 'essai', 'auteur'],
    raisons: ['Apprendre de nouvelles choses', 'Moins de temps sur les écrans', 'Me détendre le soir', 'Retrouver le plaisir de lire'],
    reperes: [
      { nom: 'Livres terminés', unite: 'livres', sens: 'up', regroupement: 'last', cible: 12, depart: 0 },
      { nom: 'Pages lues', unite: 'pages', sens: 'up', regroupement: 'sum', cible: 100, depart: 0 },
      { nom: 'Minutes de lecture', unite: 'minutes', sens: 'up', regroupement: 'sum', cible: 90, depart: 0 },
    ],
    unites: ['livres', 'pages', 'minutes', 'chapitres'],
    exemplesComment: [
      '20 pages chaque soir avant de dormir',
      'Toujours avoir un livre dans mon sac',
      'Lire dans les transports',
      'Choisir mes prochains livres à la bibliothèque',
    ],
    lieux: ['Au lit', 'Dans les transports', 'Au salon', 'À la bibliothèque'],
    actions: [
      'Lire 20 pages avant de dormir',
      'Lire 15 minutes dans les transports',
      'Choisir mon prochain livre',
      'Laisser le téléphone hors de la chambre',
      'Passer à la bibliothèque',
      'Lire 10 minutes au réveil',
    ],
    causes: [
      { famille: 'moi', label: 'Trop fatigué·e le soir' },
      { famille: 'temps', label: 'Pas de moment calme pour lire' },
      { famille: 'environnement', label: 'Le téléphone à côté de moi' },
      { famille: 'moyens', label: 'Pas de livre qui me donne envie' },
      { famille: 'methode', label: 'Un livre trop long ou trop dur' },
    ],
    placeholderAction: 'Ex. : lire 20 pages avant de dormir',
    exempleBlocage: 'Ex. : je m’endors après deux pages',
  },
  {
    id: 'sommeil',
    libelle: 'Sommeil',
    motsCles: ['dorm', 'sommeil', 'couch', 'coucher', 'nuit', 'sieste', 'reveil', 'lever', 'insomnie', 'endorm', 'fatigue', 'repos'],
    raisons: ['Avoir plus d’énergie dans la journée', 'Être de meilleure humeur', 'Prendre soin de ma santé', 'Arrêter de courir après le temps le matin'],
    reperes: [
      { nom: 'Heures de sommeil par nuit', unite: 'h', sens: 'up', regroupement: 'avg', cible: 7.5, depart: 6 },
      { nom: 'Soirs couché·e avant l’heure prévue', unite: 'soirs', sens: 'up', regroupement: 'sum', cible: 5, depart: 0 },
      { nom: 'Forme au réveil (1 à 5)', unite: '/ 5', sens: 'up', regroupement: 'avg', cible: 4, depart: 2 },
    ],
    unites: ['h', 'soirs', 'nuits', '/ 5'],
    exemplesComment: [
      'Une alarme à 22 h 30 pour aller me coucher',
      'Plus d’écran dans la chambre',
      'Une petite routine du soir : douche, lecture, lumière',
      'Me lever à la même heure, même le week-end',
    ],
    lieux: ['Dans ma chambre', 'À la maison'],
    actions: [
      'Mettre une alarme pour aller me coucher',
      'Laisser le téléphone hors de la chambre',
      'Éteindre les écrans 30 minutes avant',
      'Pas de café après 15 h',
      'Me lever à heure fixe',
      'Lire 10 minutes au lit',
    ],
    causes: [
      { famille: 'moi', label: 'Je repousse le moment d’aller au lit' },
      { famille: 'temps', label: 'Soirées trop remplies' },
      { famille: 'environnement', label: 'Bruit ou lumière dans la chambre' },
      { famille: 'moyens', label: 'Téléphone ou écran au lit' },
      { famille: 'methode', label: 'Pas d’heure de coucher fixe' },
    ],
    placeholderAction: 'Ex. : écrans éteints à 22 h 30',
    exempleBlocage: 'Ex. : je traîne sur mon téléphone au lit',
  },
  {
    id: 'alimentation',
    libelle: 'Alimentation',
    motsCles: [
      'poids', 'kg', 'kilo', 'mang', 'aliment', 'sucre', 'regime', 'maigr', 'aminc', 'legume', 'fruit', 'cuisin',
      'grignot', 'eau', 'repas', 'gras', 'nutrition', 'vegetar', 'calorie', 'soda', 'gateau', 'perdre', 'grossi',
    ],
    raisons: ['Me sentir mieux dans mon corps', 'Prendre soin de ma santé', 'Avoir plus d’énergie', 'Donner l’exemple à mes proches'],
    reperes: [
      { nom: 'Poids', unite: 'kg', sens: 'down', regroupement: 'avg', cible: 70 },
      { nom: 'Repas faits maison', unite: 'repas', sens: 'up', regroupement: 'sum', cible: 10, depart: 0 },
      { nom: 'Jours sans grignotage', unite: 'jours', sens: 'up', regroupement: 'sum', cible: 5, depart: 0 },
    ],
    unites: ['kg', 'repas', 'portions', 'jours', 'verres'],
    exemplesComment: [
      'Préparer mes repas le dimanche',
      'Une liste de courses avec des légumes',
      'Un fruit à la place du goûter sucré',
      'Me peser une fois par semaine, le même jour',
    ],
    lieux: ['À la maison', 'Au travail', 'En faisant les courses', 'Au restaurant'],
    actions: [
      'Préparer mes repas pour 2 jours',
      'Manger 5 fruits et légumes',
      'Remplacer le goûter par un fruit',
      'Boire une gourde d’eau',
      'Faire une liste de courses',
      'Me peser le lundi matin',
    ],
    causes: [
      { famille: 'moi', label: 'Grignotage quand je suis stressé·e' },
      { famille: 'temps', label: 'Pas le temps de cuisiner' },
      { famille: 'environnement', label: 'Repas de famille ou au restaurant' },
      { famille: 'moyens', label: 'Placards pleins de grignotage' },
      { famille: 'methode', label: 'Règles trop strictes d’un coup' },
    ],
    placeholderAction: 'Ex. : préparer mes repas pour 2 jours',
    exempleBlocage: 'Ex. : je grignote en rentrant du travail',
  },
  {
    id: 'apprentissage',
    libelle: 'Apprentissage',
    motsCles: [
      'anglais', 'espagnol', 'allemand', 'italien', 'chinois', 'japonais', 'portugais', 'arabe', 'langue',
      'couramment', 'appren', 'etud', 'examen', 'diplome', 'cours', 'formation', 'certif', 'permis', 'revis',
      'vocabulaire', 'duolingo', 'piano', 'guitare', 'instrument', 'musique', 'dessin', 'coder', 'programm', 'concours',
      'parler', 'bac', 'master', 'toeic', 'toefl',
    ],
    raisons: ['Voyager plus librement', 'Évoluer dans mon travail', 'Le plaisir d’apprendre', 'Réussir mon examen'],
    reperes: [
      { nom: 'Minutes d’apprentissage', unite: 'minutes', sens: 'up', regroupement: 'sum', cible: 120, depart: 0 },
      { nom: 'Leçons terminées', unite: 'leçons', sens: 'up', regroupement: 'last', cible: 50, depart: 0 },
      { nom: 'Mots appris', unite: 'mots', sens: 'up', regroupement: 'sum', cible: 50, depart: 0 },
    ],
    unites: ['minutes', 'leçons', 'mots', 'heures', 'chapitres'],
    exemplesComment: [
      '15 minutes par jour sur une appli',
      'Un cours en ligne le samedi matin',
      'Regarder une série en VO',
      'Trouver quelqu’un avec qui pratiquer',
    ],
    lieux: ['À la maison', 'Dans les transports', 'En ligne', 'À la bibliothèque'],
    actions: [
      'Faire 15 minutes d’appli',
      'Suivre une leçon en ligne',
      'Apprendre 10 nouveaux mots',
      'Regarder un épisode en VO',
      'Réviser mes fiches',
      'Pratiquer 20 minutes avec quelqu’un',
    ],
    causes: [
      { famille: 'moi', label: 'Peur de me tromper' },
      { famille: 'temps', label: 'Pas de moment fixe pour pratiquer' },
      { famille: 'environnement', label: 'Personne avec qui pratiquer' },
      { famille: 'moyens', label: 'Pas la bonne méthode ou le bon support' },
      { famille: 'methode', label: 'Sessions trop longues' },
    ],
    placeholderAction: 'Ex. : faire 15 minutes d’appli',
    exempleBlocage: 'Ex. : je n’ouvre plus mon appli',
  },
  {
    id: 'travail',
    libelle: 'Travail et projet',
    motsCles: [
      'travail', 'boulot', 'job', 'emploi', 'carriere', 'promotion', 'projet', 'entreprise', 'client', 'cv',
      'candidat', 'freelance', 'augmentation', 'poste', 'manag', 'reunion', 'lancer', 'business', 'productiv',
      'mail', 'reconversion', 'entretien', 'stage', 'linkedin', 'site', 'blog', 'podcast', 'chaine', 'ecrire',
    ],
    raisons: ['Me sentir utile et fier·e de mon travail', 'Gagner en liberté', 'Évoluer et apprendre', 'Concrétiser une idée qui me tient à cœur'],
    reperes: [
      { nom: 'Étapes du projet terminées', unite: 'étapes', sens: 'up', regroupement: 'last', cible: 10, depart: 0 },
      { nom: 'Heures sur le projet', unite: 'h', sens: 'up', regroupement: 'sum', cible: 4, depart: 0 },
      { nom: 'Candidatures envoyées', unite: 'candidatures', sens: 'up', regroupement: 'sum', cible: 3, depart: 0 },
    ],
    unites: ['étapes', 'h', 'candidatures', 'clients', 'contacts'],
    exemplesComment: [
      'Découper le projet en petites étapes',
      'Un créneau de 2 h protégé chaque semaine',
      'Contacter une personne de mon réseau par semaine',
      'Faire le point chaque vendredi',
    ],
    lieux: ['Au travail', 'À la maison', 'En ligne', 'Dans un café'],
    actions: [
      'Bloquer 2 h pour le projet',
      'Terminer une petite étape',
      'Envoyer une candidature',
      'Contacter une personne de mon réseau',
      'Mettre à jour mon CV',
      'Faire le point le vendredi',
    ],
    causes: [
      { famille: 'moi', label: 'Peur que ce ne soit pas assez bien' },
      { famille: 'temps', label: 'Les urgences passent avant' },
      { famille: 'environnement', label: 'Trop d’interruptions' },
      { famille: 'moyens', label: 'Il me manque une compétence ou un outil' },
      { famille: 'methode', label: 'Étapes trop floues ou trop grosses' },
    ],
    placeholderAction: 'Ex. : bloquer 2 h pour le projet',
    exempleBlocage: 'Ex. : je repousse toujours le projet à plus tard',
  },
  {
    id: 'relations',
    libelle: 'Proches',
    motsCles: [
      'famille', 'enfant', 'parent', 'ami', 'couple', 'conjoint', 'copain', 'copine', 'mari', 'epoux', 'epouse',
      'appeler', 'grand', 'mamie', 'papi', 'soeur', 'frere', 'soiree', 'rencontr', 'relation', 'proche', 'fils',
      'fille', 'maman', 'papa', 'amour', 'date', 'voisin',
    ],
    raisons: ['Passer plus de temps avec ceux que j’aime', 'Me sentir moins seul·e', 'Être plus présent·e', 'Garder le lien avec mes proches'],
    reperes: [
      { nom: 'Moments partagés', unite: 'moments', sens: 'up', regroupement: 'sum', cible: 2, depart: 0 },
      { nom: 'Appels à mes proches', unite: 'appels', sens: 'up', regroupement: 'sum', cible: 2, depart: 0 },
      { nom: 'Soirées sans écran ensemble', unite: 'soirées', sens: 'up', regroupement: 'sum', cible: 2, depart: 0 },
    ],
    unites: ['moments', 'appels', 'soirées', 'messages'],
    exemplesComment: [
      'Un appel à un proche chaque dimanche',
      'Une soirée par semaine sans téléphone',
      'Proposer une sortie par mois',
      'Un rituel du repas en famille',
    ],
    lieux: ['À la maison', 'Au téléphone', 'Dehors', 'Chez mes proches'],
    actions: [
      'Appeler un proche',
      'Proposer une sortie',
      'Dîner sans téléphone',
      'Envoyer un message à un ami',
      'Prévoir une activité avec les enfants',
      'Noter les anniversaires dans l’agenda',
    ],
    causes: [
      { famille: 'moi', label: 'Je n’ose pas proposer' },
      { famille: 'temps', label: 'Agendas difficiles à accorder' },
      { famille: 'environnement', label: 'La distance' },
      { famille: 'moyens', label: 'Budget pour les sorties' },
      { famille: 'methode', label: 'Pas de moment prévu à l’avance' },
    ],
    placeholderAction: 'Ex. : appeler un proche',
    exempleBlocage: 'Ex. : je n’appelle pas mes parents',
  },
  {
    id: 'habitude',
    libelle: 'Arrêter une habitude',
    motsCles: [
      'fumer', 'fume', 'cigarette', 'clope', 'tabac', 'vapot', 'nicotine', 'ecran', 'telephone', 'portable',
      'reseaux', 'instagram', 'tiktok', 'scroll', 'alcool', 'biere', 'apero', 'netflix', 'series', 'jeux video',
      'addict', 'sevr', 'arret', 'stop', 'moins de', 'sans', 'cafe', 'ongles', 'smartphone', 'boire',
    ],
    raisons: ['Reprendre le contrôle', 'Prendre soin de ma santé', 'Économiser de l’argent', 'Retrouver du temps pour moi'],
    reperes: [
      { nom: 'Jours sans', unite: 'jours', sens: 'up', regroupement: 'sum', cible: 7, depart: 0 },
      { nom: 'Fois par jour', unite: 'fois', sens: 'down', regroupement: 'avg', cible: 0 },
      { nom: 'Temps d’écran par jour', unite: 'min', sens: 'down', regroupement: 'avg', cible: 60 },
    ],
    unites: ['jours', 'fois', 'min', 'cigarettes'],
    exemplesComment: [
      'Repérer les moments où l’envie arrive',
      'Remplacer par autre chose : marcher, boire de l’eau',
      'Réduire petit à petit chaque semaine',
      'En parler à un proche ou à un professionnel',
    ],
    lieux: ['À la maison', 'Au travail', 'En soirée', 'Partout'],
    actions: [
      'Noter les moments où l’envie arrive',
      'Avoir un remplaçant sous la main',
      'Supprimer une appli du téléphone',
      'Passer une soirée sans',
      'Prévenir un proche pour qu’il m’encourage',
      'Retarder de 10 minutes quand l’envie arrive',
    ],
    causes: [
      { famille: 'moi', label: 'Envie forte quand je suis stressé·e' },
      { famille: 'temps', label: 'Moments d’ennui ou d’attente' },
      { famille: 'environnement', label: 'Entourage qui le fait aussi' },
      { famille: 'moyens', label: 'Pas de remplaçant sous la main' },
      { famille: 'methode', label: 'Arrêt trop brutal' },
    ],
    placeholderAction: 'Ex. : retarder de 10 minutes quand l’envie arrive',
    exempleBlocage: 'Ex. : je craque en soirée avec des amis',
  },
  {
    id: 'bienetre',
    libelle: 'Bien-être',
    motsCles: [
      'medit', 'stress', 'stresse', 'anxi', 'angoiss', 'respir', 'zen', 'calme', 'yoga', 'detente', 'relax', 'bien etre',
      'gratitude', 'journal', 'pause', 'sophro', 'burn', 'mental', 'moral', 'humeur', 'pleine conscience', 'serein',
      'nature', 'confiance', 'souffl',
    ],
    raisons: ['Être plus serein·e', 'Mieux gérer les journées chargées', 'Prendre du temps pour moi', 'Être plus patient·e avec mes proches'],
    reperes: [
      { nom: 'Minutes de calme', unite: 'minutes', sens: 'up', regroupement: 'sum', cible: 60, depart: 0 },
      { nom: 'Niveau de stress (1 à 5)', unite: '/ 5', sens: 'down', regroupement: 'avg', cible: 2, depart: 4 },
      { nom: 'Séances de méditation', unite: 'séances', sens: 'up', regroupement: 'sum', cible: 5, depart: 0 },
    ],
    unites: ['minutes', 'séances', '/ 5', 'jours'],
    exemplesComment: [
      '10 minutes de méditation au réveil',
      'Trois respirations avant chaque réunion',
      'Écrire 3 choses positives le soir',
      'Une marche sans téléphone à midi',
    ],
    lieux: ['À la maison', 'Dehors', 'Au travail', 'Dans les transports'],
    actions: [
      'Méditer 10 minutes',
      'Faire 3 minutes de respiration',
      'Écrire 3 choses positives',
      'Marcher 15 minutes sans téléphone',
      'Faire une séance de yoga',
      'Prendre une vraie pause à midi',
    ],
    causes: [
      { famille: 'moi', label: 'Je n’arrive pas à me poser' },
      { famille: 'temps', label: 'Pas de moment à moi' },
      { famille: 'environnement', label: 'Pas d’endroit calme' },
      { famille: 'moyens', label: 'Je ne sais pas trop comment faire' },
      { famille: 'methode', label: 'Séances trop longues' },
    ],
    placeholderAction: 'Ex. : méditer 10 minutes',
    exempleBlocage: 'Ex. : j’oublie ma pause dès que la journée s’emballe',
  },
  {
    id: 'maison',
    libelle: 'Maison',
    motsCles: [
      'rang', 'menage', 'maison', 'appart', 'desencombr', 'trier', 'tri', 'placard', 'bricol', 'jardin', 'linge',
      'vaisselle', 'minimal', 'demenag', 'renov', 'peindre', 'peinture', 'chambre', 'garage', 'cave', 'bureau', 'propre',
      'nettoy', 'dressing', 'vetement',
    ],
    raisons: ['Me sentir bien chez moi', 'Gagner du temps au quotidien', 'Recevoir sans stress', 'Avoir l’esprit plus léger'],
    reperes: [
      { nom: 'Pièces rangées', unite: 'pièces', sens: 'up', regroupement: 'last', cible: 5, depart: 0 },
      { nom: 'Minutes de rangement', unite: 'minutes', sens: 'up', regroupement: 'sum', cible: 60, depart: 0 },
      { nom: 'Sacs donnés ou jetés', unite: 'sacs', sens: 'up', regroupement: 'sum', cible: 2, depart: 0 },
    ],
    unites: ['pièces', 'minutes', 'sacs', 'objets'],
    exemplesComment: [
      '15 minutes de rangement chaque soir',
      'Une pièce par semaine',
      'Un sac à donner chaque mois',
      'Une liste des petites tâches à faire',
    ],
    lieux: ['À la maison', 'Dans ma chambre', 'Au salon', 'À la cave'],
    actions: [
      'Ranger 15 minutes',
      'Trier un placard',
      'Remplir un sac à donner',
      'Faire la vaisselle avant de dormir',
      'Lancer une machine',
      'Choisir la pièce de la semaine',
    ],
    causes: [
      { famille: 'moi', label: 'Je ne sais pas par où commencer' },
      { famille: 'temps', label: 'Fatigué·e le soir en rentrant' },
      { famille: 'environnement', label: 'Le reste du foyer ne suit pas' },
      { famille: 'moyens', label: 'Pas assez de rangements' },
      { famille: 'methode', label: 'Tout vouloir faire d’un coup' },
    ],
    placeholderAction: 'Ex. : ranger 15 minutes',
    exempleBlocage: 'Ex. : le désordre revient en quelques jours',
  },
  {
    id: 'autre',
    libelle: 'Autre',
    motsCles: [],
    raisons: ['Me sentir en forme', 'Avoir plus confiance en moi', 'Être serein·e côté argent', 'Avoir plus de temps pour moi'],
    reperes: [
      { nom: 'Fois où je l’ai fait', unite: 'fois', sens: 'up', regroupement: 'sum', cible: 3, depart: 0 },
      { nom: 'Minutes consacrées', unite: 'minutes', sens: 'up', regroupement: 'sum', cible: 60, depart: 0 },
    ],
    unites: ['fois', 'minutes', 'jours', '€', 'pages'],
    exemplesComment: [
      'Un petit pas chaque jour',
      'Un créneau fixe chaque semaine',
      'Commencer par 10 minutes',
    ],
    lieux: ['À la maison', 'Dehors', 'Au travail', 'En ligne'],
    actions: [
      'Préparer mes affaires la veille',
      'Bloquer un créneau dans mon agenda',
      'Commencer par 10 minutes',
      'Faire le point le dimanche',
      'En parler à un proche',
      'Mettre un rappel sur mon téléphone',
    ],
    causes: [],
    placeholderAction: 'Ex. : 10 minutes chaque soir',
    exempleBlocage: 'Ex. : je repousse au lendemain',
  },
];

const PAR_ID = new Map<string, Profil>(PROFILS.map((p) => [p.id, p]));
export const PROFIL_AUTRE: Profil = PAR_ID.get('autre')!;

/** Minuscules, sans accents, chiffres séparés des lettres, ponctuation remplacée par des espaces. */
export function normaliser(texte: string): string {
  return ` ${texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/€/g, ' € ')
    .replace(/(\d)([a-z])/g, '$1 $2')
    .replace(/[^a-z0-9€]+/g, ' ')
    .trim()} `;
}

/** Score d'un profil : somme des longueurs des mots-clés trouvés en début de mot (les racines longues pèsent plus). */
function score(texteNormalise: string, profil: Profil): number {
  let s = 0;
  for (const mot of profil.motsCles) {
    const k = mot === '€' ? '€' : ` ${mot}`;
    if (texteNormalise.includes(k)) s += mot === '€' ? 5 : mot.length;
  }
  return s;
}

/** Profil le plus probable pour un texte libre ; « Autre » si rien ne ressort. */
export function detecterProfil(texte: string): Profil {
  const t = normaliser(texte);
  let best = PROFIL_AUTRE;
  let bestScore = 0;
  for (const p of PROFILS) {
    const s = score(t, p);
    if (s > bestScore) {
      best = p;
      bestScore = s;
    }
  }
  return best;
}

export function profilParId(id: string | null | undefined): Profil | undefined {
  return id ? PAR_ID.get(id) : undefined;
}

/** Profil d'un objectif : celui choisi s'il est connu, sinon recalculé à partir du titre et du « quoi ». */
export function profilDeObjectif(goal: { profil?: string; title: string; context?: { what?: string }; smart?: { specific?: string } }): Profil {
  return profilParId(goal.profil) ?? detecterProfil([goal.title, goal.context?.what ?? goal.smart?.specific ?? ''].join(' '));
}

const cle = (s: string) => normaliser(s).trim();

/** Fusionne des listes de libellés sans doublons (comparaison sans casse ni accents), en gardant l'ordre. */
export function fusionnerSansDoublons(...listes: readonly (readonly string[])[]): string[] {
  const vus = new Set<string>();
  const out: string[] = [];
  for (const liste of listes) {
    for (const s of liste) {
      const k = cle(s);
      if (!k || vus.has(k)) continue;
      vus.add(k);
      out.push(s);
    }
  }
  return out;
}

/** Vrai si deux libellés sont identiques à la casse et aux accents près. */
export function memeLibelle(a: string, b: string): boolean {
  return cle(a) === cle(b);
}

/** Premier nombre écrit dans le texte (« Lire 12 livres » → 12, « 1 000 € » → 1000), sinon null. */
export function premierNombre(texte: string): number | null {
  const m = /(\d{1,3}(?:[  .]\d{3})+|\d+)(?:[,.](\d+))?/.exec(texte);
  if (!m) return null;
  const n = Number(`${m[1].replace(/[  .]/g, '')}${m[2] ? `.${m[2]}` : ''}`);
  return Number.isFinite(n) ? n : null;
}
