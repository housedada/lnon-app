ALTER TABLE projects ADD COLUMN budget_share NUMERIC(5,2) NOT NULL DEFAULT 100;
ALTER TABLE projects ADD COLUMN completed_at TIMESTAMPTZ;

CREATE TABLE project_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  job_id UUID REFERENCES jobs(id),
  client_id UUID REFERENCES clients(id),
  project_title VARCHAR(255) NOT NULL,
  job_title VARCHAR(255),
  client_name VARCHAR(255) NOT NULL,
  net_amount NUMERIC(12,2) NOT NULL,
  vat_rate NUMERIC(5,2) NOT NULL DEFAULT 22,
  vat_amount NUMERIC(12,2) NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  line_items JSONB NOT NULL DEFAULT '[]',
  status VARCHAR(20) NOT NULL DEFAULT 'da_fatturare',
  merged_into_id UUID REFERENCES project_invoices(id),
  fic_invoice_id INT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_project_invoices_client_id ON project_invoices(client_id);
CREATE INDEX idx_project_invoices_project_id ON project_invoices(project_id);
ALTER TABLE project_invoices ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_project_invoices_updated_at BEFORE UPDATE ON project_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
