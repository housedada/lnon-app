import { auth } from '@/lib/auth';
import {
  getUsers,
  getAllAssignedProjects,
  getProjectsByAssignee,
  getTeamColumnOrder,
  getPersonalColumnOrder,
  getProductColorsForJobs,
  getProjectTasks,
  getOpenHourlyWorkEntriesCount,
  getOrCreatePersonalNotesProject,
} from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { DEMO_USERS, DEMO_PROJECTS, DEMO_TASKS_BY_PROJECT, DEMO_PRODUCT_COLORS_BY_JOB } from '@/lib/demoData';
import TaskBoardModeTabs from '@/components/TaskBoardModeTabs';
import TeamBoard from '@/components/TeamBoard';
import PersonalBoard from '@/components/PersonalBoard';
import TaskBoardViewToggle from '@/components/TaskBoardViewToggle';
import TaskBoardExpandToggle from '@/components/TaskBoardExpandToggle';
import SpecialProjectsToggle from '@/components/SpecialProjectsToggle';
import TaskBoardBottomNav from '@/components/TaskBoardBottomNav';
import DemoDataControls from '@/components/DemoDataControls';
import NewProjectButton from '@/components/NewProjectButton';
import NotesSidebar from '@/components/NotesSidebar';
import NotesSidebarToggle from '@/components/NotesSidebarToggle';
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
  const role = (session?.user as { role?: 'superadmin' | 'admin' | 'dipendente' } | undefined)?.role ?? 'dipendente';
  const canManageInvoices = role === 'superadmin' || role === 'admin';
  const canCreateProjects = hasPermission(role, 'projects', 'create');
  const includeDemo = canManageInvoices && demo === '1';

  const [allUsers, openHourlyCount] = await Promise.all([getUsers(), getOpenHourlyWorkEntriesCount()]);
  const userOptions = allUsers.filter((u) => u.isActive).map((u) => ({ id: u.id, name: u.name, color: u.color }));

  const notesProject = userId ? await getOrCreatePersonalNotesProject(userId) : null;
  const notesTasks = notesProject ? await getProjectTasks(notesProject.id) : [];

  return (
    <div className="flex h-[calc(100vh-50px)] flex-col">
      <div className="task-toolbar-border flex shrink-0 items-center gap-1 px-4 py-2">
        <NotesSidebarToggle />
        <TaskBoardModeTabs mode={mode} />
        <TaskBoardExpandToggle />
        <div className="ml-auto flex items-center gap-2">
          <SpecialProjectsToggle openCount={openHourlyCount} />
          <div className="h-6 w-px bg-grid-border" />
          <div className="[&>div]:!ml-0">
            <TaskBoardViewToggle />
          </div>
          {canCreateProjects && <NewProjectButton userOptions={userOptions} />}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {notesProject && <NotesSidebar project={notesProject} initialTasks={notesTasks} userOptions={userOptions} />}
        <div className="relative min-h-0 flex-1">
          {mode === 'team' ? (
            <TeamView currentUserId={userId} canManageInvoices={canManageInvoices} includeDemo={includeDemo} />
          ) : (
            <PersonalView userId={userId} canManageInvoices={canManageInvoices} includeDemo={includeDemo} />
          )}
          {canManageInvoices && (
            <div className="absolute bottom-3 right-3 z-10 rounded-md border border-grid-border bg-card-bg/90 shadow-lg backdrop-blur">
              <DemoDataControls />
            </div>
          )}
        </div>
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
  const [users, allAssignedProjects, savedOrder] = await Promise.all([
    getUsers(),
    getAllAssignedProjects(),
    currentUserId ? getTeamColumnOrder(currentUserId) : Promise.resolve([]),
  ]);
  const realProjects = allAssignedProjects.filter((p) => p.systemSource !== 'personal_notes');

  const activeUsers = includeDemo ? [...users.filter((u) => u.isActive), ...DEMO_USERS] : users.filter((u) => u.isActive);
  const allProjects = includeDemo ? [...realProjects, ...DEMO_PROJECTS] : realProjects;

  const jobIds = Array.from(new Set(realProjects.map((p) => p.jobId).filter((id): id is string => Boolean(id))));
  const productColorsMap = await getProductColorsForJobs(jobIds);
  const productColorsByJob = { ...Object.fromEntries(productColorsMap), ...(includeDemo ? DEMO_PRODUCT_COLORS_BY_JOB : {}) };

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
      productColorsByJob={productColorsByJob}
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
  const assignedProjects = userId ? await getProjectsByAssignee(userId) : [];
  const realProjects = assignedProjects.filter((p) => p.systemSource !== 'personal_notes');
  const jobIds = Array.from(new Set(realProjects.map((p) => p.jobId).filter((id): id is string => Boolean(id))));

  const [productColorsMap, allUsers, realTaskLists, savedOrder] = await Promise.all([
    getProductColorsForJobs(jobIds),
    getUsers(),
    Promise.all(realProjects.map((p) => getProjectTasks(p.id))),
    userId ? getPersonalColumnOrder(userId) : Promise.resolve([]),
  ]);
  const productColorsByJob = { ...Object.fromEntries(productColorsMap), ...(includeDemo ? DEMO_PRODUCT_COLORS_BY_JOB : {}) };
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
