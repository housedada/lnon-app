'use client';

import { Suspense, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronDown, Menu, X } from 'lucide-react';
import type { UserRole } from '@/lib/types';
import { getUserPermissions } from '@/lib/permissions';
import { NAV_ITEMS, shouldShowNavItem, type NavSubItem } from '@/lib/navItems';

interface SidebarProps {
  role: UserRole;
}

function isSubItemActive(sub: NavSubItem, pathname: string | null, searchParams: URLSearchParams): boolean {
  const subPath = sub.href.split('?')[0];
  if (pathname !== subPath) return false;
  if (!sub.matchQuery) return true;
  const current = searchParams.get(sub.matchQuery.key) ?? sub.matchQuery.default;
  return current === sub.matchQuery.value;
}

function SidebarContent({ role, onNavigate }: SidebarProps & { onNavigate?: () => void }) {
  const permissions = getUserPermissions(role);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <nav className="sidebar-edge flex h-full flex-col gap-1 bg-neutral-900 px-3 py-4 text-neutral-100">
      {NAV_ITEMS.filter((item) => shouldShowNavItem(item.resource, permissions[item.resource] ?? [])).map((item) => {
        const isActive = pathname?.startsWith(item.href) ?? false;
        return (
          <div key={item.resource} className={item.subItems ? 'sidebar-nav-item relative' : undefined}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-semibold transition hover:bg-neutral-800 hover:text-neutral-100 ${
                isActive ? 'bg-neutral-800 font-bold text-neutral-100' : 'text-neutral-300'
              }`}
            >
              <item.icon size={16} strokeWidth={1.75} aria-hidden="true" />
              {item.label}
            </Link>
            {item.subItems && (
              <span
                aria-hidden="true"
                className="sidebar-chevron-trigger absolute right-0 top-0 flex h-9 w-9 items-center justify-center"
              >
                <ChevronDown size={13} strokeWidth={2} className="sidebar-chevron text-neutral-400" aria-hidden="true" />
              </span>
            )}
            {item.subItems && (
              <div className={`sidebar-submenu ${isActive ? 'sidebar-submenu-open' : ''}`}>
                <div className="flex flex-col gap-0.5 py-1 pl-3 pr-1">
                  {item.subItems.map((sub) => {
                    const subActive = isSubItemActive(sub, pathname, searchParams);
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={onNavigate}
                        className={`sidebar-submenu-link rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                          subActive ? 'text-neutral-100' : 'text-neutral-400 hover:text-neutral-100'
                        }`}
                      >
                        {sub.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
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

      {/* Sidebar fissa desktop: position fixed, non scrolla mai con la pagina */}
      <aside className="hidden md:fixed md:left-0 md:top-[50px] md:block md:h-[calc(100vh-50px)] md:w-[188px] md:shrink-0 md:z-30">
        <Suspense fallback={null}>
          <SidebarContent role={role} />
        </Suspense>
      </aside>
      <div className="hidden md:block md:w-[188px] md:shrink-0" aria-hidden="true" />

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
            <Suspense fallback={null}>
              <SidebarContent role={role} onNavigate={() => setMobileOpen(false)} />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}
