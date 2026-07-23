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

const FIRST_NAMES = ['Giulia', 'Marco', 'Sara', 'Luca', 'Elena', 'Davide', 'Chiara', 'Matteo', 'Francesca'];
const LAST_NAMES = ['Bianchi', 'Rossi', 'Ferrari', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Conti'];
const PROJECT_WORDS = ['Restyling sito', 'Landing page', 'Campagna social', 'SEO audit', 'Shop online', 'App mobile', 'Rebranding', 'Newsletter', 'Migrazione CMS', 'Portale clienti'];
const TASK_TITLES = ['Bozza contenuti', 'Revisione grafica', 'Setup ambiente', 'Test funzionale', 'Consegna al cliente', 'Ottimizzazione performance', 'Correzione bug', 'Meeting kickoff'];
const STATUSES: ProjectTaskStatus[] = ['todo', 'in_progress', 'completed'];

const DEMO_USER_COUNT = 9;

export const DEMO_USERS: User[] = Array.from({ length: DEMO_USER_COUNT }, (_, i) => {
  const name = `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[i % LAST_NAMES.length]}`;
  return {
    id: `demo-user-${i + 1}`,
    email: `demo-user-${i + 1}@example.invalid`,
    name,
    role: 'dipendente',
    isActive: true,
    color: USER_TAG_COLORS[i % USER_TAG_COLORS.length],
    isDemo: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
});

const PROJECTS_PER_USER = [3, 2, 5, 4, 3, 2, 5, 3, 4];

export const DEMO_PROJECTS: Project[] = [];
export const DEMO_TASKS_BY_PROJECT: Record<string, ProjectTask[]> = {};

DEMO_USERS.forEach((user, userIndex) => {
  const count = PROJECTS_PER_USER[userIndex % PROJECTS_PER_USER.length];
  for (let p = 0; p < count; p++) {
    const projectId = `demo-project-${userIndex + 1}-${p + 1}`;
    DEMO_PROJECTS.push({
      id: projectId,
      title: `${pick(PROJECT_WORDS)} — ${user.name.split(' ')[0]}`,
      assignedTo: user.id,
      budgetShare: 100,
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
