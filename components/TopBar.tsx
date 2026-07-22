'use client';

import Image from 'next/image';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { User, LogOut, History, Bell } from 'lucide-react';
import type { UserRole } from '@/lib/types';
import { getRoleLabel } from '@/lib/permissions';
import ThemeToggle from '@/components/ThemeToggle';
import Popover from '@/components/Popover';

export default function TopBar({ role, userName }: { role: UserRole; userName: string }) {
  return (
    <header className="flex h-[50px] shrink-0 items-center justify-between border-b border-grid-border bg-card-bg px-4">
      <Link href="/dashboard" className="flex items-center">
        <Image src="/logo.png" alt="Housedada" width={84} height={17} className="topbar-logo" />
      </Link>

      <div className="flex items-center gap-1">
        <Popover
          trigger={({ toggle }) => (
            <button
              type="button"
              onClick={toggle}
              aria-label="Notifiche"
              className="flex h-8 w-8 items-center justify-center rounded-md text-secondary transition hover:bg-row-hover hover:text-primary"
            >
              <Bell size={17} strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}
        >
          <p className="px-3 py-2 text-xs text-secondary">Nessuna notifica per ora.</p>
        </Popover>

        <Popover
          trigger={({ toggle }) => (
            <button
              type="button"
              onClick={toggle}
              aria-label="Log attività"
              className="flex h-8 w-8 items-center justify-center rounded-md text-secondary transition hover:bg-row-hover hover:text-primary"
            >
              <History size={17} strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}
        >
          <p className="px-3 py-2 text-xs text-secondary">Log attività in arrivo.</p>
        </Popover>

        <ThemeToggle />

        <Popover
          trigger={({ toggle }) => (
            <button
              type="button"
              onClick={toggle}
              aria-label="Menu utente"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-grid-header-bg text-secondary transition hover:text-primary"
            >
              <User size={16} strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}
        >
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-primary">{userName}</p>
            <p className="text-xs text-secondary">{getRoleLabel(role)}</p>
          </div>
          <div className="my-1 border-t border-grid-border" />
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/auth/signin' })}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-secondary transition hover:bg-row-hover hover:text-primary"
          >
            <LogOut size={14} strokeWidth={1.75} aria-hidden="true" />
            Esci
          </button>
        </Popover>
      </div>
    </header>
  );
}
