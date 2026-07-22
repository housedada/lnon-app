'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { GripVertical, Briefcase } from 'lucide-react';
import { saveTeamColumnOrderAction } from '@/lib/actions/projects';
import type { Project } from '@/lib/types';

interface TeamMember {
  id: string;
  name: string;
}

export default function TeamBoard({
  members,
  projectsByUser,
}: {
  members: TeamMember[];
  projectsByUser: Record<string, Project[]>;
}) {
  const [order, setOrder] = useState<string[]>(members.map((m) => m.id));
  const [dragId, setDragId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const membersById = new Map(members.map((m) => [m.id, m]));

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    setOrder((prev) => {
      const next = prev.filter((id) => id !== dragId);
      const targetIndex = next.indexOf(targetId);
      next.splice(targetIndex, 0, dragId);
      startTransition(() => {
        saveTeamColumnOrderAction(next);
      });
      return next;
    });
    setDragId(null);
  }

  return (
    <div className="flex h-full gap-3 overflow-x-auto px-4 pb-4 pt-3">
      {order.map((userId) => {
        const member = membersById.get(userId);
        if (!member) return null;
        const projects = projectsByUser[userId] ?? [];

        return (
          <div
            key={userId}
            draggable
            onDragStart={() => setDragId(userId)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(userId)}
            className="flex w-64 shrink-0 flex-col rounded-xl border border-grid-border bg-grid-header-bg"
          >
            <div className="flex cursor-grab items-center gap-1.5 border-b border-grid-border px-3 py-2 active:cursor-grabbing">
              <GripVertical size={14} strokeWidth={1.75} className="text-muted" aria-hidden="true" />
              <span className="text-sm font-semibold text-primary">{member.name}</span>
              <span className="ml-auto text-[10px] text-secondary">{projects.length}</span>
            </div>

            <div className="flex flex-1 flex-col gap-2 p-2">
              {projects.length === 0 && <p className="px-2 py-4 text-center text-[11px] text-secondary">Nessun progetto</p>}
              {projects.map((project) => (
                <div key={project.id} className="card-shadow rounded-lg border border-grid-border bg-card-bg p-3">
                  <p className="text-sm font-medium text-primary">{project.title}</p>
                  {project.jobTitle && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-secondary">
                      <Briefcase size={11} strokeWidth={1.75} aria-hidden="true" />
                      {project.jobTitle}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {order.length === 0 && (
        <p className="px-6 py-12 text-sm text-secondary">
          Nessun membro del team attivo.{' '}
          <Link href="/dashboard/users" className="underline">
            Gestisci utenti
          </Link>
        </p>
      )}
    </div>
  );
}
