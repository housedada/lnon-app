'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import CreateProjectFromJobModal from '@/components/CreateProjectFromJobModal';
import ProjectDetailModal from '@/components/ProjectDetailModal';
import type { Project } from '@/lib/types';

type Step = 'confirm' | 'tasks' | null;

/**
 * Orchestra il flusso "crea lavoro -> crea progetto -> aggiungi task" innescato
 * dal toggle nel form del lavoro: riusa CreateProjectFromJobModal (step 1) e
 * ProjectDetailModal (step 2, lo stesso della card progetto in Task) senza
 * introdurre nuovi componenti di dettaglio.
 */
function JobCreateProjectFlowInner({
  job,
  userOptions,
  canManageInvoices,
}: {
  job: { id: string; title: string } | null;
  userOptions: { id: string; name: string; color?: string }[];
  canManageInvoices: boolean;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [step, setStep] = useState<Step>(job ? 'confirm' : null);
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    setStep(job ? 'confirm' : null);
    setProject(null);
    if (!job && searchParams.has('createProject')) {
      clearParam();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id]);

  function clearParam() {
    const next = new URLSearchParams(searchParams.toString());
    next.delete('createProject');
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function handleClose() {
    setStep(null);
    setProject(null);
    clearParam();
  }

  if (!job || !step) return null;

  return (
    <>
      {step === 'confirm' && (
        <CreateProjectFromJobModal
          jobId={job.id}
          jobTitle={job.title}
          userOptions={userOptions}
          onClose={handleClose}
          onSuccess={(createdProject) => {
            setProject({ ...createdProject, jobTitle: job.title });
            setStep('tasks');
          }}
        />
      )}
      {step === 'tasks' && project && (
        <ProjectDetailModal
          project={project}
          initialTasks={[]}
          userOptions={userOptions}
          canManageInvoices={canManageInvoices}
          onClose={handleClose}
        />
      )}
    </>
  );
}

export default function JobCreateProjectFlow(props: {
  job: { id: string; title: string } | null;
  userOptions: { id: string; name: string; color?: string }[];
  canManageInvoices: boolean;
}) {
  return (
    <Suspense fallback={null}>
      <JobCreateProjectFlowInner {...props} />
    </Suspense>
  );
}
