import SectionTabs from '@/components/SectionTabs';

export default function ContractsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h1 className="p-6 pb-0 text-2xl font-semibold text-primary">Contratti</h1>
      <SectionTabs
        storageKey="contracts-tab"
        tabs={[
          { key: 'manutenzioni', label: 'Web', href: '/dashboard/contracts' },
          { key: 'orario', label: 'Conteggio Orario', href: '/dashboard/contracts/hourly' },
        ]}
      />
      {children}
    </div>
  );
}
