-- Migration: tabela de audit log para mudanças de status do kanban
-- Rodar no SQL Editor do Supabase

-- 1. Campo auxiliar para o trigger capturar quem fez a mudança
ALTER TABLE kanban_items ADD COLUMN IF NOT EXISTS changed_by text;

-- 2. Tabela de log
CREATE TABLE kanban_status_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kanban_item_id uuid NOT NULL REFERENCES kanban_items(id) ON DELETE CASCADE,
  previous_status text NOT NULL,
  new_status text NOT NULL,
  changed_by text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_status_log_changed_at ON kanban_status_log(changed_at);
CREATE INDEX idx_status_log_item ON kanban_status_log(kanban_item_id);

-- 3. Trigger function
CREATE OR REPLACE FUNCTION log_kanban_status_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO kanban_status_log (kanban_item_id, previous_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, NEW.changed_by);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger
CREATE TRIGGER trg_kanban_status_change
  AFTER UPDATE ON kanban_items
  FOR EACH ROW
  EXECUTE FUNCTION log_kanban_status_change();
