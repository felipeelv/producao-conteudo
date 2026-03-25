export interface Chapter {
  id: string
  name: string
  completed: boolean
}

export interface Unit {
  id: string
  name: string
  chapters: Chapter[]
}

export interface Bimester {
  id: string
  name: string
  units: Unit[]
}

export interface Year {
  id: string
  name: string
  bimesters: Bimester[]
}

export interface Discipline {
  id: string
  name: string
  description?: string
  schoolYear?: number
  color?: string
  years: Year[]
}

// Tipos para importacao do JSON do usuario
export interface ImportedChapter {
  capitulos: string[]
}

export interface ImportedUnit {
  unidade: string
  capitulos: string[]
}

export interface ImportedBimester {
  bimestre: string
  unidades: ImportedUnit[]
}

export interface ImportedYear {
  ano: string
  bimestres: ImportedBimester[]
}

export interface ImportedDiscipline {
  disciplina: string
  descricao?: string
  ano_letivo?: number
  anos: ImportedYear[]
}

export type KanbanStatus = 'production' | 'layout' | 'printing' | 'completed'

export interface KanbanChapter {
  id: string
  name: string
}

export interface KanbanItem {
  id: string
  disciplineId: string
  disciplineName: string
  yearId: string
  yearName: string
  bimesterId: string
  bimesterName: string
  unitId: string
  unitName: string
  chapters: KanbanChapter[]
  status: KanbanStatus
  printApproved: boolean
  createdAt: string
}

export interface CalendarChapter {
  id: string
  name: string
}

export type CalendarItemType = 'content' | 'workbook'

export interface CalendarItem {
  id: string
  date: string
  disciplineId: string
  disciplineName: string
  yearId: string
  yearName: string
  bimesterId: string
  bimesterName: string
  unitId: string
  unitName: string
  chapters: CalendarChapter[]
  color: string
  itemType: CalendarItemType
}

// Tipo para itens do Kanban de Caderno de Atividades (mesma estrutura do KanbanItem)
export interface WorkbookItem {
  id: string
  disciplineId: string
  disciplineName: string
  yearId: string
  yearName: string
  bimesterId: string
  bimesterName: string
  unitId: string
  unitName: string
  chapters: KanbanChapter[]
  status: KanbanStatus
  createdAt: string
}

export interface ProductionStats {
  totalChapters: number
  completedChapters: number
  inProduction: number
  inLayout: number
  inPrinting: number
  inCompleted: number
}

// Tipos de eventos do calendario
export type CalendarEventType = 'bimester' | 'exam' | 'delivery' | 'meeting' | 'holiday' | 'recess' | 'other'

export interface CalendarEvent {
  id: string
  title: string
  eventType: CalendarEventType
  startDate: string
  endDate: string | null
  color: string
  description: string | null
  createdAt: string
}

// Cores padrão para tipos de eventos
export const EVENT_TYPE_COLORS: Record<CalendarEventType, string> = {
  bimester: '#3b82f6',   // Azul
  exam: '#ef4444',       // Vermelho
  delivery: '#f59e0b',   // Amarelo/Laranja
  meeting: '#8b5cf6',    // Roxo
  holiday: '#6b7280',    // Cinza
  recess: '#9ca3af',     // Cinza claro
  other: '#10b981'       // Verde
}

export const EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  bimester: 'Bimestre',
  exam: 'Prova',
  delivery: 'Entrega',
  meeting: 'Reuniao',
  holiday: 'Feriado',
  recess: 'Recesso/Ferias',
  other: 'Outro'
}
