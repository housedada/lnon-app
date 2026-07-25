import { supabaseServer } from '@/lib/db';
import type { ProjectTask, ProjectTaskStatus, HourlyWorkEntryStatus } from '@/lib/types';

/**
 * Cascata isolata: se il task completato/riaperto corrisponde a una
 * lavorazione a conteggio orario (verificato via project_task_id E
 * conferma che il Project collegato sia system_source='hourly_contract'),
 * allinea lo stato della lavorazione. Per qualunque task normale (nessuna
 * hourly_work_entries collegata, oppure Project non system-generated) è
 * un no-op garantito — non tocca mai nulla al di fuori di questa feature.
 */
export async function applyHourlyWorkEntryCascade(task: ProjectTask, newStatus: ProjectTaskStatus): Promise<void> {
  const { data: entry } = await supabaseServer
    .from('hourly_work_entries')
    .select('id, status')
    .eq('project_task_id', task.id)
    .is('deleted_at', null)
    .maybeSingle();
  if (!entry) return;

  const { data: project } = await supabaseServer
    .from('projects')
    .select('id, system_source')
    .eq('id', task.projectId)
    .single();
  if (project?.system_source !== 'hourly_contract') return;

  const targetStatus: HourlyWorkEntryStatus = newStatus === 'completed' ? 'completata' : 'assegnata';
  if (entry.status === targetStatus) return;

  await supabaseServer.from('hourly_work_entries').update({ status: targetStatus }).eq('id', entry.id);
}
