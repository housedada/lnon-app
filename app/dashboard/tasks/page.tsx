import Link from 'next/link';
import { Users2, User } from 'lucide-react';
import { auth } from '@/lib/auth';
import { getUsers, getAllAssignedProjects, getProjectsByAssignee, getTeamColumnOrder, getPersonalColumnOrder, getProductColorsForJobs, getProjectTasks } from '@/lib/db';
import { DEMO_USERS, DEMO_PROJECTS, DEMO_TASKS_BY_PROJECT } from '@/lib/demoData';
import TeamBoard from '@/components/TeamBoard';
import PersonalBoard from '@/components/PersonalBoard';
import TaskBoardViewToggle from '@/components/TaskBoardViewToggle';
import TaskBoardBottomNav from '@/components/TaskBoardBottomNav';
import DemoDataControls from '@/components/DemoDataControls';
import type { Project, ProjectTask } from '@/lib/types';

export const metadata = { title: 'Task' };

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; demo?: string }>;
}) {
  const { view, demo } = await searchParams;
  const mode = view === 'personal' ? 'personal' : 'team';

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id ?? '';
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role;
  const canManageInvoices = role === 'superadmin' || role === 'admin';
  const includeDemo = canManageInvoices && demo === '1';

  return (
    <div className="flex h-[calc(100vh-50px)] flex-col">
      <div className="task-toolbar-border flex shrink-0 items-center gap-1 px-4 py-2">
        <Link
          href="/dashboard/tasks?view=team"
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
            mode === 'team' ? 'bg-row-hover text-primary' : 'text-secondary hover:text-primary'
          }`}
        >
          <Users2 size={14} strokeWidth={1.75} aria-hidden="true" />
          Team
        </Link>
        <Link
          href="/dashboard/tasks?view=personal"
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
            mode === 'personal' ? 'bg-row-hover text-primary' : 'text-secondary hover:text-primary'
          }`}
        >
          <User size={14} strokeWidth={1.75} aria-hidden="true" />
          Personale
        </Link>
        <TaskBoardViewToggle />
        {canManageInvoices && <DemoDataControls />}
      </div>

      <div className="min-h-0 flex-1">
        {mode === 'team' ? (
          <TeamView currentUserId={userId} canManageInvoices={canManageInvoices} includeDemo={includeDemo} />
        ) : (
          <PersonalView userId={userId} canManageInvoices={canManageInvoices} includeDemo={includeDemo} />
        )}
      </div>
      <TaskBoardBottomNav />
    </div>
  );
}

async function TeamView({
  currentUserId,
  canManageInvoices,
  includeDemo,
}: {
  currentUserId: string;
  canManageInvoices: boolean;
  includeDemo: boolean;
}) {
  const [users, realProjects, savedOrder] = await Promise.all([
    getUsers(),
    getAllAssignedProjects(),
    currentUserId ? getTeamColumnOrder(currentUserId) : Promise.resolve([]),
  ]);

  const activeUsers = includeDemo ? [...users.filter((u) => u.isActive), ...DEMO_USERS] : users.filter((u) => u.isActive);
  const allProjects = includeDemo ? [...realProjects, ...DEMO_PROJECTS] : realProjects;

  const projectsByUser: Record<string, Project[]> = {};
  for (const project of allProjects) {
    if (!project.assignedTo) continue;
    (projectsByUser[project.assignedTo] ??= []).push(project);
  }

  const byId = new Map(activeUsers.map((u) => [u.id, u]));
  const ordered = [
    ...savedOrder.filter((id) => byId.has(id)),
    ...activeUsers.filter((u) => !savedOrder.includes(u.id)).sort((a, b) => a.name.localeCompare(b.name)).map((u) => u.id),
  ];
  const members = ordered.map((id) => ({ id, name: byId.get(id)!.name, color: byId.get(id)!.color }));

  const realTaskLists = await Promise.all(realProjects.map((p) => getProjectTasks(p.id)));
  const tasksByProject: Record<string, ProjectTask[]> = Object.fromEntries(realProjects.map((p, i) => [p.id, realTaskLists[i]]));
  if (includeDemo) Object.assign(tasksByProject, DEMO_TASKS_BY_PROJECT);
  const userOptions = activeUsers.map((u) => ({ id: u.id, name: u.name, color: u.color }));

  return (
    <TeamBoard
      members={members}
      projectsByUser={projectsByUser}
      tasksByProject={tasksByProject}
      userOptions={userOptions}
      canManageInvoices={canManageInvoices}
    />
  );
}

async function PersonalView({
  userId,
  canManageInvoices,
  includeDemo,
}: {
  userId: string;
  canManageInvoices: boolean;
  includeDemo: boolean;
}) {
  const realProjects = userId ? await getProjectsByAssignee(userId) : [];
  const jobIds = Array.from(new Set(realProjects.map((p) => p.jobId).filter((id): id is string => Boolean(id))));

  const [productColorsMap, allUsers, realTaskLists, savedOrder] = await Promise.all([
    getProductColorsForJobs(jobIds),
    getUsers(),
    Promise.all(realProjects.map((p) => getProjectTasks(p.id))),
    userId ? getPersonalColumnOrder(userId) : Promise.resolve([]),
  ]);
  const productColorsByJob = Object.fromEntries(productColorsMap);
  const userOptions = includeDemo
    ? [...allUsers.filter((u) => u.isActive), ...DEMO_USERS].map((u) => ({ id: u.id, name: u.name, color: u.color }))
    : allUsers.filter((u) => u.isActive).map((u) => ({ id: u.id, name: u.name, color: u.color }));

  const tasksByProject: Record<string, ProjectTask[]> = Object.fromEntries(realProjects.map((p, i) => [p.id, realTaskLists[i]]));
  if (includeDemo) Object.assign(tasksByProject, DEMO_TASKS_BY_PROJECT);

  const projects = includeDemo ? [...realProjects, ...DEMO_PROJECTS] : realProjects;
  const byId = new Map(projects.map((p) => [p.id, p]));
  const orderedProjects = [
    ...savedOrder.filter((id) => byId.has(id)).map((id) => byId.get(id)!),
    ...projects.filter((p) => !savedOrder.includes(p.id)),
  ];

  return (
    <PersonalBoard
      projects={orderedProjects}
      productColorsByJob={productColorsByJob}
      tasksByProject={tasksByProject}
      userOptions={userOptions}
      canManageInvoices={canManageInvoices}
    />
  );
}
