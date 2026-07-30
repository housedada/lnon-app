'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { User, LogOut, History, Bell, SlidersHorizontal, BarChart3 } from 'lucide-react';
import type { UserRole } from '@/lib/types';
import { getRoleLabel } from '@/lib/permissions';
import ThemeToggle from '@/components/ThemeToggle';
import Popover from '@/components/Popover';
import AudioPlayerToggle from '@/components/AudioPlayerToggle';
import ZenNoiseToggle from '@/components/ZenNoiseToggle';
import SpaceInvaderIcon from '@/components/SpaceInvaderIcon';
import CrownIcon from '@/components/CrownIcon';
import ChiptuneSelectModal from '@/components/ChiptuneSelectModal';
import { TUNES, RANDOM_CHOICE, CHIPTUNE_CHOICE_STORAGE_KEY } from '@/lib/chiptunes';
import { useContractsStatsStore } from '@/lib/store/contractsStatsStore';
import { useJobsFilterStore } from '@/lib/store/jobsFilterStore';
import { useInvoicesFilterStore } from '@/lib/store/invoicesFilterStore';

export default function TopBar({
  role,
  userName,
  userImage,
}: {
  role: UserRole;
  userName: string;
  userImage?: string | null;
}) {
  const pathname = usePathname();
  const isContractsPage = pathname?.startsWith('/dashboard/contracts');
  const isJobsPage = pathname?.startsWith('/dashboard/jobs');
  const isInvoicesPage = pathname?.startsWith('/dashboard/invoices');
  const contractsStatsVisible = useContractsStatsStore((s) => s.visible);
  const toggleContractsStats = useContractsStatsStore((s) => s.toggle);
  const jobsFilterVisible = useJobsFilterStore((s) => s.visible);
  const toggleJobsFilter = useJobsFilterStore((s) => s.toggle);
  const invoicesFilterVisible = useInvoicesFilterStore((s) => s.visible);
  const toggleInvoicesFilter = useInvoicesFilterStore((s) => s.toggle);

  const [chiptuneChoice, setChiptuneChoice] = useState(RANDOM_CHOICE);
  const [chiptuneModalOpen, setChiptuneModalOpen] = useState(false);
  useEffect(() => {
    setChiptuneChoice(localStorage.getItem(CHIPTUNE_CHOICE_STORAGE_KEY) ?? RANDOM_CHOICE);
  }, []);
  const chiptuneLabel = chiptuneChoice === RANDOM_CHOICE ? 'Casuale' : (TUNES.find((t) => t.id === chiptuneChoice)?.name ?? 'Casuale');
  // getRoleLabel antepone un'emoji (usata altrove, es. Gestione Accessi); qui la
  // sostituiamo con un'icona SVG dedicata (corona oro per il superadmin).
  const roleLabelText = getRoleLabel(role).replace(/^\p{Emoji}\s*/u, '');

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-[50px] items-center justify-between border-b border-neutral-800 bg-[var(--color-chrome-bg)] px-4">
      <Link href="/dashboard" className="flex items-center">
        <Image src="/logo.png" alt="Housedada" width={84} height={17} />
      </Link>

      <div className="flex items-center gap-1">
        {isContractsPage && (
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

        {isInvoicesPage && (
          <button
            type="button"
            onClick={toggleInvoicesFilter}
            aria-label="Mostra/nascondi filtri fatture"
            aria-pressed={invoicesFilterVisible}
            className={`flex h-8 w-8 items-center justify-center rounded-md transition ${
              invoicesFilterVisible ? 'bg-amber-500/15 text-amber-500' : 'text-amber-500/80 hover:bg-neutral-800 hover:text-amber-500'
            }`}
          >
            <SlidersHorizontal size={17} strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}

        <AudioPlayerToggle />
        <ZenNoiseToggle />

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
            <p className="truncate text-sm font-medium text-primary">{userName}</p>
            <div className="my-1.5 border-t border-grid-border" />
            <p className="flex items-center gap-1 text-xs font-normal text-secondary">
              {role === 'superadmin' && <CrownIcon size={12} />}
              {roleLabelText}
            </p>
          </div>
          <div className="my-1 border-t border-grid-border" />
          <button
            type="button"
            onClick={() => setChiptuneModalOpen(true)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-secondary transition hover:bg-row-hover hover:text-primary"
          >
            <SpaceInvaderIcon size={17} />
            {chiptuneLabel}
          </button>
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

      {chiptuneModalOpen && (
        <ChiptuneSelectModal
          selected={chiptuneChoice}
          onSelect={setChiptuneChoice}
          onClose={() => setChiptuneModalOpen(false)}
        />
      )}
    </header>
  );
}
