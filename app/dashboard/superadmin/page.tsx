import { getRoleDescription } from '@/lib/permissions';
import DashboardSections from '@/components/DashboardSections';

export default function SuperadminDashboardPage() {
  return (
    <div>
      <div className="p-6 pb-0">
        <h1 className="text-2xl font-semibold text-primary">Dashboard Super Admin</h1>
        <p className="mt-1 text-sm text-secondary">{getRoleDescription('superadmin')}</p>
      </div>

      <div className="p-6">
        <DashboardSections role="superadmin" />
      </div>
    </div>
  );
}
