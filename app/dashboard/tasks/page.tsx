import Link from 'next/link';
import { Users2, User } from 'lucide-react';
import { auth } from '@/lib/auth';
import { getUsers, getAllAssignedProjects, getProjectsByAssignee, getTeamColumnOrder, getProductColorsForJobs } from '@/lib/db';
import TeamBoard from '@/components/TeamBoard';
import PersonalBoard from '@/components/PersonalBoard';
import TaskBoardViewToggle from '@/components/TaskBoardViewToggle';
import type { Project } from '@/lib/types';

export const metadata = { title: 'Task' };

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const mode = view === 'personal' ? 'personal' : 'team';

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id ?? '';

  return (
    <div className="flex h-[calc(100vh-50px)] flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b border-grid-border px-4 py-2">
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
      </div>

      <div className="min-h-0 flex-1">
        {mode === 'team' ? <TeamView currentUserId={userId} /> : <PersonalView userId={userId} />}
      </div>
    </div>
  );
}

async function TeamView({ currentUserId }: { currentUserId: string }) {
  const [users, allProjects, savedOrder] = await Promise.all([
    getUsers(),
    getAllAssignedProjects(),
    currentUserId ? getTeamColumnOrder(currentUserId) : Promise.resolve([]),
  ]);

  const activeUsers = users.filter((u) => u.isActive);

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

  return <TeamBoard members={members} projectsByUser={projectsByUser} />;
}

async function PersonalView({ userId }: { userId: string }) {
  const projects = userId ? await getProjectsByAssignee(userId) : [];
  const jobIds = Array.from(new Set(projects.map((p) => p.jobId).filter((id): id is string => Boolean(id))));
  const productColorsMap = await getProductColorsForJobs(jobIds);
  const productColorsByJob = Object.fromEntries(productColorsMap);

  return <PersonalBoard projects={projects} productColorsByJob={productColorsByJob} />;
}
