ALTER TABLE project_tasks ADD COLUMN parent_task_id UUID REFERENCES project_tasks(id) ON DELETE CASCADE;
CREATE INDEX idx_project_tasks_parent_task_id ON project_tasks(parent_task_id);
