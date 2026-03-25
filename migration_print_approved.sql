-- Migration: adiciona campo print_approved na tabela kanban_items
-- Rodar no SQL Editor do Supabase

ALTER TABLE kanban_items
  ADD COLUMN IF NOT EXISTS print_approved boolean NOT NULL DEFAULT false;
