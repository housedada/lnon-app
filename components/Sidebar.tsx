'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import type { UserRole } from '@/lib/types';
import { getUserPermissions, getRoleLabel } from '@/lib/permissions';

interface SidebarProps {
  role: UserRole;
  userName: string;
}

interface NavItem {
  resource: string;
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { resource: 'clients', label: 'Clienti', href: '/dashboard/clients' },
  { resource: 'jobs', label: 'Lavori', href: '/dashboard/jobs' },
  { resource: 'tasks', label: 'Task', href: '/dashboard/tasks' },
  { resource: 'invoices', label: 'Fatture', href: '/dashboard/invoices' },
  { resource: 'users', label: 'Utenti', href: '/dashboard/users' },
  { resource: 'reports', label: 'Report', href: '/dashboard/reports' },
  { resource: 'audit_logs', label: 'Log Attività', href: '/dashboard/audit-logs' },
  { resource: 'settings', label: 'Impostazioni', href: '/dashboard/settings' },
];

// 'users' e 'settings' concedono sempre almeno 'read' a tutti i ruoli
// (vedi PERMISSION_MATRIX in lib/permissions.ts) ma non devono comparire
// come sezioni di navigazione complete per i ruoli con permessi minimi:
// mostriamo 'Utenti' solo a chi può fare più di un semplice 'read' del
// proprio profilo (cioè chi ha anche 'invite' o superiore).
function shouldShowNavItem(resource: string, permissions: string[]): boolean {
  if (permissions.length === 0) return false;
  if (resource === 'users') return permissions.includes('invite') || permissions.includes('create');
  return true;
}

function SidebarContent({ role, userName, onNavigate }: SidebarProps & { onNavigate?: () => void }) {
  const permissions = getUserPermissions(role);

  return (
    <div className="flex h-full flex-col bg-neutral-900 text-neutral-100">
      <div className="border-b border-neutral-800 px-5 py-5">
        <Image src="/logo.png" alt="Housedada" width={100} height={20} />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.filter((item) => shouldShowNavItem(item.resource, permissions[item.resource] ?? [])).map(
          (item) => (
            <Link
              key={item.resource}
              href={item.href}
              onClick={onNavigate}
              className="block rounded-md px-3 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800 hover:text-neutral-100"
            >
              {item.label}
            </Link>
          )
        )}
      </nav>

      <div className="border-t border-neutral-800 px-6 py-4">
        <p className="text-sm font-medium text-neutral-100">{userName}</p>
        <p className="text-xs text-neutral-400">{getRoleLabel(role)}</p>
        <button
          onClick={() => signOut({ callbackUrl: '/auth/signin' })}
          className="mt-3 text-sm text-neutral-400 underline transition hover:text-neutral-200"
        >
          Esci
        </button>
      </div>
    </div>
  );
}

export default function Sidebar({ role, userName }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="md:contents">
      {/* Header mobile con hamburger */}
      <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-4 py-3 md:hidden">
        <Image src="/logo.png" alt="Housedada" width={90} height={18} />
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Apri menu"
          className="rounded-md p-2 text-neutral-300 hover:bg-neutral-800"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Sidebar fissa desktop */}
      <aside className="hidden md:block md:w-44 md:shrink-0">
        <SidebarContent role={role} userName={userName} />
      </aside>

      {/* Drawer overlay mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-64 shadow-xl">
            <SidebarContent role={role} userName={userName} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
