'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { User, LogOut, History, Bell, SlidersHorizontal, BarChart3 } from 'lucide-react';
import type { UserRole } from '@/lib/types';
import { getRoleLabel, hasPermission } from '@/lib/permissions';
import ThemeToggle from '@/components/ThemeToggle';
import Popover from '@/components/Popover';
import UserColorPicker from '@/components/UserColorPicker';
import JobsSelectionToggle from '@/components/JobsSelectionToggle';
import { useContractsFilterStore } from '@/lib/store/contractsFilterStore';
import { useContractsStatsStore } from '@/lib/store/contractsStatsStore';
import { useJobsFilterStore } from '@/lib/store/jobsFilterStore';

export default function TopBar({
  role,
  userName,
  userImage,
  userColor,
}: {
  role: UserRole;
  userName: string;
  userImage?: string | null;
  userColor?: string;
}) {
  const pathname = usePathname();
  const isContractsPage = pathname?.startsWith('/dashboard/contracts');
  const isJobsPage = pathname?.startsWith('/dashboard/jobs');
  const isJobsListPage = pathname === '/dashboard/jobs';
  const canUpdateJobs = hasPermission(role, 'jobs', 'update');
  const contractsFilterVisible = useContractsFilterStore((s) => s.visible);
  const toggleContractsFilter = useContractsFilterStore((s) => s.toggle);
  const contractsStatsVisible = useContractsStatsStore((s) => s.visible);
  const toggleContractsStats = useContractsStatsStore((s) => s.toggle);
  const jobsFilterVisible = useJobsFilterStore((s) => s.visible);
  const toggleJobsFilter = useJobsFilterStore((s) => s.toggle);

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-[50px] items-center justify-between border-b border-neutral-800 bg-neutral-900 px-4">
      <Link href="/dashboard" className="flex items-center">
        <Image src="/logo.png" alt="Housedada" width={84} height={17} />
      </Link>

      <div className="flex items-center gap-1">
        {isContractsPage && (
          <>
            <button
              type="button"
              onClick={toggleContractsStats}
              aria-label="Mostra/nascondi riepilogo contratti"
              aria-pressed={contractsStatsVisible}
              className={`flex h-8 w-8 items-center justify-center rounded-md transition ${
                contractsStatsVisible ? 'bg-sky-500/15 text-sky-500' : 'text-sky-500/80 hover:bg-neutral-800 hover:text-sky-500'
              }`}
            >
              <BarChart3 size={17} strokeWidth={1.75} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={toggleContractsFilter}
              aria-label="Mostra/nascondi filtri contratti"
              aria-pressed={contractsFilterVisible}
              className={`flex h-8 w-8 items-center justify-center rounded-md transition ${
                contractsFilterVisible ? 'bg-amber-500/15 text-amber-500' : 'text-amber-500/80 hover:bg-neutral-800 hover:text-amber-500'
              }`}
            >
              <SlidersHorizontal size={17} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </>
        )}

        {isJobsPage && (
          <button
            type="button"
            onClick={toggleJobsFilter}
            aria-label="Mostra/nascondi filtri lavori"
            aria-pressed={jobsFilterVisible}
            className={`flex h-8 w-8 items-center justify-center rounded-md transition ${
              jobsFilterVisible ? 'bg-amber-500/15 text-amber-500' : 'text-amber-500/80 hover:bg-neutral-800 hover:text-amber-500'
            }`}
          >
            <SlidersHorizontal size={17} strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}

        {isJobsListPage && canUpdateJobs && <JobsSelectionToggle />}

        <Popover
          trigger={({ toggle }) => (
            <button
              type="button"
              onClick={toggle}
              aria-label="Notifiche"
              className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-300 transition hover:bg-neutral-800 hover:text-neutral-100"
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
              className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-300 transition hover:bg-neutral-800 hover:text-neutral-100"
            >
              <History size={17} strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}
        >
          <p className="px-3 py-2 text-xs text-secondary">Log attività in arrivo.</p>
        </Popover>

        <ThemeToggle dark />

        <Popover
          trigger={({ toggle }) => (
            <button
              type="button"
              onClick={toggle}
              aria-label="Menu utente"
              className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full shadow-sm"
            >
              {userImage ? (
                <Image src={userImage} alt="" width={32} height={32} className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-800 text-neutral-300">
                  <User size={16} strokeWidth={1.75} aria-hidden="true" />
                </span>
              )}
            </button>
          )}
        >
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-primary">{userName}</p>
            <p className="text-xs text-secondary">{getRoleLabel(role)}</p>
          </div>
          <div className="my-1 border-t border-grid-border" />
          <p className="px-3 pt-1 text-[10px] font-medium uppercase tracking-wide text-secondary">Colore tag</p>
          <UserColorPicker currentColor={userColor} />
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
