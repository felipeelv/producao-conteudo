-- Criar tabela de disciplinas
CREATE TABLE IF NOT EXISTS disciplines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  school_year INTEGER,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela de itens do kanban
CREATE TABLE IF NOT EXISTS kanban_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discipline_id UUID REFERENCES disciplines(id) ON DELETE CASCADE,
  discipline_name TEXT NOT NULL,
  year_id TEXT NOT NULL,
  year_name TEXT NOT NULL,
  bimester_id TEXT NOT NULL,
  bimester_name TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  unit_name TEXT NOT NULL,
  chapters JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'production',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela de itens do calendario
CREATE TABLE IF NOT EXISTS calendar_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  discipline_id UUID REFERENCES disciplines(id) ON DELETE CASCADE,
  discipline_name TEXT NOT NULL,
  year_id TEXT NOT NULL,
  year_name TEXT NOT NULL,
  bimester_id TEXT NOT NULL,
  bimester_name TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  unit_name TEXT NOT NULL,
  chapters JSONB NOT NULL DEFAULT '[]',
  color TEXT NOT NULL DEFAULT '#10b981',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
