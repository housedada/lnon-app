'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  Users,
  Briefcase,
  CheckSquare,
  FileText,
  UserCog,
  BarChart2,
  History,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '@/lib/types';
import { getUserPermissions } from '@/lib/permissions';

interface SidebarProps {
  role: UserRole;
}

interface NavItem {
  resource: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { resource: 'clients', label: 'Clienti', href: '/dashboard/clients', icon: Users },
  { resource: 'jobs', label: 'Lavori', href: '/dashboard/jobs', icon: Briefcase },
  { resource: 'tasks', label: 'Task', href: '/dashboard/tasks', icon: CheckSquare },
  { resource: 'invoices', label: 'Fatture', href: '/dashboard/invoices', icon: FileText },
  { resource: 'users', label: 'Utenti', href: '/dashboard/users', icon: UserCog },
  { resource: 'reports', label: 'Report', href: '/dashboard/reports', icon: BarChart2 },
  { resource: 'audit_logs', label: 'Log Attività', href: '/dashboard/audit-logs', icon: History },
  { resource: 'settings', label: 'Impostazioni', href: '/dashboard/settings', icon: Settings },
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

function SidebarContent({ role, onNavigate }: SidebarProps & { onNavigate?: () => void }) {
  const permissions = getUserPermissions(role);
  const pathname = usePathname();

  return (
    <nav className="sidebar-edge flex h-full flex-col gap-1 bg-neutral-900 px-3 py-4 text-neutral-100">
      {NAV_ITEMS.filter((item) => shouldShowNavItem(item.resource, permissions[item.resource] ?? [])).map((item) => {
        const isActive = pathname?.startsWith(item.href);
        return (
          <Link
            key={item.resource}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-semibold transition hover:bg-neutral-800 hover:text-neutral-100 ${
              isActive ? 'bg-neutral-800 font-bold text-neutral-100' : 'text-neutral-300'
            }`}
          >
            <item.icon size={16} strokeWidth={1.75} aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function Sidebar({ role }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="md:contents">
      {/* Pulsante hamburger mobile (la topbar ospita già logo/utente) */}
      <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-4 py-2 md:hidden">
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Menu</span>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Apri menu"
          className="rounded-md p-2 text-neutral-300 hover:bg-neutral-800"
        >
          <Menu size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>

      {/* Sidebar fissa desktop */}
      <aside className="hidden md:sticky md:top-0 md:block md:h-[calc(100vh-50px)] md:w-44 md:shrink-0">
        <SidebarContent role={role} />
      </aside>

      {/* Drawer overlay mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 w-64 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-4 py-3">
              <Image src="/logo.png" alt="Housedada" width={90} height={18} />
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Chiudi menu"
                className="rounded-md p-2 text-neutral-300 hover:bg-neutral-800"
              >
                <X size={20} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
            <SidebarContent role={role} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
