CREATE TABLE project_task_assignees (
  task_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, user_id)
);
CREATE INDEX idx_project_task_assignees_user_id ON project_task_assignees(user_id);
ALTER TABLE project_task_assignees ENABLE ROW LEVEL SECURITY;

-- Migra gli assegnatari singoli esistenti nella nuova tabella multi-assegnatario
INSERT INTO project_task_assignees (task_id, user_id)
SELECT id, assigned_to FROM project_tasks WHERE assigned_to IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE project_tasks DROP COLUMN assigned_to;
