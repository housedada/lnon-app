ALTER TABLE users ADD COLUMN is_demo BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE projects ADD COLUMN is_demo BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX idx_users_is_demo ON users(is_demo);
CREATE INDEX idx_projects_is_demo ON projects(is_demo);
