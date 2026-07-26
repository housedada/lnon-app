// lib/demoData.ts - Dataset fittizio hardcoded (nessuna scrittura su DB) usato solo
// per testare UI/UX della board Task con molte colonne. Attivabile/disattivabile
// tramite il toggle "Demo" (?demo=1), che unisce questi dati a quelli reali solo
// lato rendering — non tocca mai il database.

import { USER_TAG_COLORS } from './types';
import type { Project, ProjectTask, ProjectTaskStatus, User } from './types';

// PRNG seedato (mulberry32): risultati stabili tra un reload e l'altro,
// così la demo è sempre uguale a se stessa mentre la si guarda.
function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42);
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
function randInt(min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}
function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function randomColor(): string {
  return pick([...USER_TAG_COLORS]);
}

// Utenti umani reali di HouseDada (niente account tecnici/gruppo), colori assegnati random.
const REAL_USERS = [
  { first: 'Alessandro', last: 'Carella', email: 'alessandrocarella@housedada.com' },
  { first: 'Aldo', last: 'Goccione', email: 'aldogoccione@housedada.com' },
  { first: 'Michele', last: 'Canevese', email: 'michelecanevese@housedada.com' },
  { first: 'Valentina', last: 'Quagliotto', email: 'valentinaquagliotto@housedada.com' },
  { first: 'Marco', last: 'Candrian', email: 'marcocandrian@housedada.com' },
  { first: 'Lorena', last: 'Lauran', email: 'lorenalauran@housedada.com' },
  { first: 'Cosimo', last: 'Scatigno', email: 'cosimoscatigno@housedada.com' },
  { first: 'Stage', last: 'Housedada', email: 'stage@housedada.com' },
];

const PROJECT_WORDS = ['Restyling sito', 'Landing page', 'Campagna social', 'SEO audit', 'Shop online', 'App mobile', 'Rebranding', 'Newsletter', 'Migrazione CMS', 'Portale clienti'];
const TASK_TITLES = ['Bozza contenuti', 'Revisione grafica', 'Setup ambiente', 'Test funzionale', 'Consegna al cliente', 'Ottimizzazione performance', 'Correzione bug', 'Meeting kickoff'];
const STATUSES: ProjectTaskStatus[] = ['todo', 'in_progress', 'completed'];
// Prodotti fittizi, per colorare l'header delle card progetto come nella board reale
// (dove il colore arriva dai prodotti associati al Job collegato).
const PRODUCT_NAMES = ['Sito Web', 'SEO', 'Social Media', 'Hosting', 'App Mobile', 'Email Marketing', 'Grafica', 'Advertising'];

export const DEMO_USERS: User[] = REAL_USERS.map((u, i) => ({
  id: `demo-user-${i + 1}`,
  email: u.email,
  name: `${u.first} ${u.last}`,
  role: 'dipendente',
  isActive: true,
  color: randomColor(),
  isDemo: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}));

// Colore random per ogni prodotto fittizio (una volta sola, stabile per tutta la demo)
const DEMO_PRODUCT_COLORS = Object.fromEntries(PRODUCT_NAMES.map((name) => [name, randomColor()]));

const PROJECTS_PER_USER = [3, 2, 5, 4, 3, 2, 5, 3];

export const DEMO_PROJECTS: Project[] = [];
export const DEMO_TASKS_BY_PROJECT: Record<string, ProjectTask[]> = {};
// jobId fittizio -> colori dei prodotti associati (stessa shape di getProductColorsForJobs)
export const DEMO_PRODUCT_COLORS_BY_JOB: Record<string, string[]> = {};

DEMO_USERS.forEach((user, userIndex) => {
  const count = PROJECTS_PER_USER[userIndex % PROJECTS_PER_USER.length];
  for (let p = 0; p < count; p++) {
    const projectId = `demo-project-${userIndex + 1}-${p + 1}`;
    const jobId = `demo-job-${userIndex + 1}-${p + 1}`;
    const productCount = randInt(1, 2);
    const products = shuffled(PRODUCT_NAMES).slice(0, productCount);
    DEMO_PRODUCT_COLORS_BY_JOB[jobId] = products.map((name) => DEMO_PRODUCT_COLORS[name]);

    DEMO_PROJECTS.push({
      id: projectId,
      jobId,
      title: `${pick(PROJECT_WORDS)} — ${user.name.split(' ')[0]}`,
      assignedTo: user.id,
      isDemo: true,
      createdBy: user.id,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    });

    const taskCount = randInt(2, 6);
    const tasks: ProjectTask[] = [];
    for (let t = 0; t < taskCount; t++) {
      const taskId = `demo-task-${projectId}-${t + 1}`;
      const assignee = rand() > 0.3 ? pick(DEMO_USERS) : undefined;
      tasks.push({
        id: taskId,
        projectId,
        title: pick(TASK_TITLES),
        status: pick(STATUSES),
        position: t,
        createdBy: user.id,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        assignedToIds: assignee ? [assignee.id] : [],
        assignedToUsers: assignee ? [{ id: assignee.id, name: assignee.name, color: assignee.color }] : [],
      });

      // ~35% delle task principali ricevono un sotto task (un solo livello, come nella board reale)
      if (rand() < 0.35) {
        const subId = `${taskId}-sub-1`;
        const subAssignee = rand() > 0.4 ? pick(DEMO_USERS) : undefined;
        tasks.push({
          id: subId,
          projectId,
          parentTaskId: taskId,
          title: pick(TASK_TITLES),
          status: pick(STATUSES),
          position: 0,
          createdBy: user.id,
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
          assignedToIds: subAssignee ? [subAssignee.id] : [],
          assignedToUsers: subAssignee ? [{ id: subAssignee.id, name: subAssignee.name, color: subAssignee.color }] : [],
        });
      }
    }
    DEMO_TASKS_BY_PROJECT[projectId] = tasks;
  }
});
