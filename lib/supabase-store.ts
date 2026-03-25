'use client'

import { createClient } from '@/lib/supabase/client'
import { 
  Discipline, 
  KanbanItem, 
  CalendarItem, 
  CalendarItemType,
  WorkbookItem,
  CalendarEvent,
  CalendarEventType,
  ProductionStats, 
  KanbanStatus,
  ImportedDiscipline,
  Chapter,
  Unit,
  Bimester,
  Year
} from './types'

// ==================== DISCIPLINES ====================

export async function getDisciplinesFromDB(): Promise<Discipline[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('disciplines')
    .select('*')
    .order('created_at', { ascending: true })
  
  if (error) {
    console.error('Error fetching disciplines:', error)
    return []
  }
  
  return data.map(row => ({
    id: row.id,
    name: row.name,
    description: row.description,
    schoolYear: row.school_year,
    years: row.data?.years || []
  }))
}

export async function saveDisciplineToDB(discipline: Discipline): Promise<Discipline | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('disciplines')
    .upsert({
      id: discipline.id,
      name: discipline.name,
      description: discipline.description || null,
      school_year: discipline.schoolYear || null,
      data: { years: discipline.years },
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' })
    .select()
    .single()
  
  if (error) {
    console.error('Error saving discipline:', error)
    return null
  }
  
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    schoolYear: data.school_year,
    years: data.data?.years || []
  }
}

export async function saveDisciplinesToDB(disciplines: Discipline[]): Promise<void> {
  const supabase = createClient()
  
  const rows = disciplines.map(discipline => ({
    id: discipline.id,
    name: discipline.name,
    description: discipline.description || null,
    school_year: discipline.schoolYear || null,
    data: { years: discipline.years },
    updated_at: new Date().toISOString()
  }))
  
  const { error } = await supabase
    .from('disciplines')
    .upsert(rows, { onConflict: 'id' })
  
  if (error) {
    console.error('Error saving disciplines:', error)
  }
}

export async function deleteDisciplineFromDB(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('disciplines')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting discipline:', error)
  }
}

export async function deleteAllDisciplinesFromDB(): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('disciplines')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
  
  if (error) {
    console.error('Error deleting all disciplines:', error)
  }
}

// ==================== KANBAN ====================

export async function getKanbanItemsFromDB(): Promise<KanbanItem[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('kanban_items')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching kanban items:', error)
    return []
  }

  return data.map(row => ({
    id: row.id,
    disciplineId: row.discipline_id,
    disciplineName: row.discipline_name,
    yearId: row.year_id,
    yearName: row.year_name,
    bimesterId: row.bimester_id,
    bimesterName: row.bimester_name,
    unitId: row.unit_id,
    unitName: row.unit_name,
    chapters: row.chapters || [],
    status: row.status as KanbanStatus,
    printApproved: row.print_approved ?? false,
    createdAt: row.created_at
  }))
}

export async function addKanbanItemToDB(item: Omit<KanbanItem, 'id' | 'createdAt'>): Promise<KanbanItem | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('kanban_items')
    .insert({
      discipline_id: item.disciplineId,
      discipline_name: item.disciplineName,
      year_id: item.yearId,
      year_name: item.yearName,
      bimester_id: item.bimesterId,
      bimester_name: item.bimesterName,
      unit_id: item.unitId,
      unit_name: item.unitName,
      chapters: item.chapters,
      status: item.status,
      print_approved: false
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding kanban item:', error)
    return null
  }

  return {
    id: data.id,
    disciplineId: data.discipline_id,
    disciplineName: data.discipline_name,
    yearId: data.year_id,
    yearName: data.year_name,
    bimesterId: data.bimester_id,
    bimesterName: data.bimester_name,
    unitId: data.unit_id,
    unitName: data.unit_name,
    chapters: data.chapters || [],
    status: data.status as KanbanStatus,
    printApproved: data.print_approved ?? false,
    createdAt: data.created_at
  }
}

export async function updateKanbanItemStatusInDB(id: string, status: KanbanStatus): Promise<void> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('kanban_items')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  
  if (error) {
    console.error('Error updating kanban item status:', error)
  }
}

export async function updateKanbanItemPrintApprovalInDB(id: string, printApproved: boolean): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('kanban_items')
    .update({ print_approved: printApproved, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('Error updating kanban item print approval:', error)
  }
}

export async function removeKanbanItemFromDB(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('kanban_items')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error removing kanban item:', error)
  }
}

// ==================== CALENDAR ====================

export async function getCalendarItemsFromDB(): Promise<CalendarItem[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('calendar_items')
    .select('*')
    .order('date', { ascending: true })
  
  if (error) {
    console.error('Error fetching calendar items:', error)
    return []
  }
  
  return data.map(row => ({
    id: row.id,
    date: row.date,
    disciplineId: row.discipline_id,
    disciplineName: row.discipline_name,
    yearId: row.year_id,
    yearName: row.year_name,
    bimesterId: row.bimester_id,
    bimesterName: row.bimester_name,
    unitId: row.unit_id,
    unitName: row.unit_name,
    chapters: row.chapters || [],
    color: row.color,
    itemType: (row.item_type || 'content') as CalendarItemType
  }))
}

export async function addCalendarItemToDB(item: Omit<CalendarItem, 'id'>): Promise<CalendarItem | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('calendar_items')
    .insert({
      date: item.date,
      discipline_id: item.disciplineId,
      discipline_name: item.disciplineName,
      year_id: item.yearId,
      year_name: item.yearName,
      bimester_id: item.bimesterId,
      bimester_name: item.bimesterName,
      unit_id: item.unitId,
      unit_name: item.unitName,
      chapters: item.chapters,
      color: item.color,
      item_type: item.itemType || 'content'
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error adding calendar item:', error)
    return null
  }
  
  return {
    id: data.id,
    date: data.date,
    disciplineId: data.discipline_id,
    disciplineName: data.discipline_name,
    yearId: data.year_id,
    yearName: data.year_name,
    bimesterId: data.bimester_id,
    bimesterName: data.bimester_name,
    unitId: data.unit_id,
    unitName: data.unit_name,
    chapters: data.chapters || [],
    color: data.color,
    itemType: (data.item_type || 'content') as CalendarItemType
  }
}

export async function updateCalendarItemDateInDB(id: string, date: string): Promise<void> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('calendar_items')
    .update({ date })
    .eq('id', id)
  
  if (error) {
    console.error('Error updating calendar item date:', error)
  }
}

export async function removeCalendarItemFromDB(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('calendar_items')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error removing calendar item:', error)
  }
}

// ==================== WORKBOOK (Caderno de Atividades) ====================

export async function getWorkbookItemsFromDB(): Promise<WorkbookItem[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('workbook_items')
    .select('*')
    .order('created_at', { ascending: true })
  
  if (error) {
    console.error('Error fetching workbook items:', error)
    return []
  }
  
  return data.map(row => ({
    id: row.id,
    disciplineId: row.discipline_id,
    disciplineName: row.discipline_name,
    yearId: row.year_id,
    yearName: row.year_name,
    bimesterId: row.bimester_id,
    bimesterName: row.bimester_name,
    unitId: row.unit_id,
    unitName: row.unit_name,
    chapters: row.chapters || [],
    status: row.status as KanbanStatus,
    createdAt: row.created_at
  }))
}

export async function addWorkbookItemToDB(item: Omit<WorkbookItem, 'id' | 'createdAt'>): Promise<WorkbookItem | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('workbook_items')
    .insert({
      discipline_id: item.disciplineId,
      discipline_name: item.disciplineName,
      year_id: item.yearId,
      year_name: item.yearName,
      bimester_id: item.bimesterId,
      bimester_name: item.bimesterName,
      unit_id: item.unitId,
      unit_name: item.unitName,
      chapters: item.chapters,
      status: item.status
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error adding workbook item:', error)
    return null
  }
  
  return {
    id: data.id,
    disciplineId: data.discipline_id,
    disciplineName: data.discipline_name,
    yearId: data.year_id,
    yearName: data.year_name,
    bimesterId: data.bimester_id,
    bimesterName: data.bimester_name,
    unitId: data.unit_id,
    unitName: data.unit_name,
    chapters: data.chapters || [],
    status: data.status as KanbanStatus,
    createdAt: data.created_at
  }
}

export async function updateWorkbookItemStatusInDB(id: string, status: KanbanStatus): Promise<void> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('workbook_items')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  
  if (error) {
    console.error('Error updating workbook item status:', error)
  }
}

export async function removeWorkbookItemFromDB(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('workbook_items')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error removing workbook item:', error)
  }
}

// ==================== CALENDAR EVENTS ====================

export async function getCalendarEventsFromDB(): Promise<CalendarEvent[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .order('start_date', { ascending: true })
  
  if (error) {
    console.error('Error fetching calendar events:', error)
    return []
  }
  
  return data.map(row => ({
    id: row.id,
    title: row.title,
    eventType: row.event_type as CalendarEventType,
    startDate: row.start_date,
    endDate: row.end_date,
    color: row.color,
    description: row.description,
    createdAt: row.created_at
  }))
}

export async function addCalendarEventToDB(event: Omit<CalendarEvent, 'id' | 'createdAt'>): Promise<CalendarEvent | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      title: event.title,
      event_type: event.eventType,
      start_date: event.startDate,
      end_date: event.endDate,
      color: event.color,
      description: event.description
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error adding calendar event:', error)
    return null
  }
  
  return {
    id: data.id,
    title: data.title,
    eventType: data.event_type as CalendarEventType,
    startDate: data.start_date,
    endDate: data.end_date,
    color: data.color,
    description: data.description,
    createdAt: data.created_at
  }
}

export async function updateCalendarEventInDB(id: string, event: Partial<Omit<CalendarEvent, 'id' | 'createdAt'>>): Promise<void> {
  const supabase = createClient()
  
  const updateData: Record<string, unknown> = {}
  if (event.title !== undefined) updateData.title = event.title
  if (event.eventType !== undefined) updateData.event_type = event.eventType
  if (event.startDate !== undefined) updateData.start_date = event.startDate
  if (event.endDate !== undefined) updateData.end_date = event.endDate
  if (event.color !== undefined) updateData.color = event.color
  if (event.description !== undefined) updateData.description = event.description
  
  const { error } = await supabase
    .from('calendar_events')
    .update(updateData)
    .eq('id', id)
  
  if (error) {
    console.error('Error updating calendar event:', error)
  }
}

export async function removeCalendarEventFromDB(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error removing calendar event:', error)
  }
}

// ==================== STATS ====================

export async function getProductionStatsFromDB(): Promise<ProductionStats> {
  const disciplines = await getDisciplinesFromDB()
  const kanbanItems = await getKanbanItemsFromDB()
  
  let totalChapters = 0
  let completedChapters = 0
  
  disciplines.forEach(discipline => {
    discipline.years.forEach(year => {
      year.bimesters.forEach(bimester => {
        bimester.units.forEach(unit => {
          unit.chapters.forEach(chapter => {
            totalChapters++
            if (chapter.completed) completedChapters++
          })
        })
      })
    })
  })
  
  const inProduction = kanbanItems.filter(item => item.status === 'production').length
  const inLayout = kanbanItems.filter(item => item.status === 'layout').length
  const inPrinting = kanbanItems.filter(item => item.status === 'printing').length
  const inCompleted = kanbanItems.filter(item => item.status === 'completed').length
  
  return {
    totalChapters,
    completedChapters,
    inProduction,
    inLayout,
    inPrinting,
    inCompleted
  }
}

// ==================== HELPERS ====================

export const COLORS = [
  '#22c55e',
  '#3b82f6',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16'
]

export function getRandomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)]
}

function generateId(prefix: string, name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30)
  return `${prefix}-${slug}-${Math.random().toString(36).substring(2, 6)}`
}

export function convertImportedDiscipline(imported: ImportedDiscipline): Discipline {
  const disciplineId = crypto.randomUUID()
  
  const years: Year[] = imported.anos.map((importedYear) => {
    const yearId = generateId('year', importedYear.ano)
    
    const bimesters: Bimester[] = importedYear.bimestres.map((importedBimester) => {
      const bimesterId = generateId('bim', importedBimester.bimestre)
      
      const units: Unit[] = importedBimester.unidades.map((importedUnit) => {
        const unitId = generateId('unit', importedUnit.unidade)
        
        const chapters: Chapter[] = importedUnit.capitulos.map((chapterName) => ({
          id: generateId('chap', chapterName),
          name: chapterName,
          completed: false
        }))
        
        return {
          id: unitId,
          name: importedUnit.unidade,
          chapters
        }
      })
      
      return {
        id: bimesterId,
        name: importedBimester.bimestre,
        units
      }
    })
    
    return {
      id: yearId,
      name: importedYear.ano,
      bimesters
    }
  })
  
  return {
    id: disciplineId,
    name: imported.disciplina,
    description: imported.descricao,
    schoolYear: imported.ano_letivo,
    years
  }
}

export function validateImportedJSON(data: unknown): { valid: boolean; error?: string; data?: ImportedDiscipline | ImportedDiscipline[] } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'JSON invalido' }
  }
  
  const disciplines = Array.isArray(data) ? data : [data]
  
  for (const disc of disciplines) {
    if ('disciplina' in disc) {
      if (!disc.disciplina || typeof disc.disciplina !== 'string') {
        return { valid: false, error: 'Cada disciplina deve ter o campo "disciplina" (string)' }
      }
      if (!disc.anos || !Array.isArray(disc.anos)) {
        return { valid: false, error: 'Cada disciplina deve ter o campo "anos" (array)' }
      }
      
      for (const year of disc.anos) {
        if (!year.ano || typeof year.ano !== 'string') {
          return { valid: false, error: 'Cada ano deve ter o campo "ano" (string)' }
        }
        if (!year.bimestres || !Array.isArray(year.bimestres)) {
          return { valid: false, error: 'Cada ano deve ter o campo "bimestres" (array)' }
        }
        
        for (const bimester of year.bimestres) {
          if (!bimester.bimestre || typeof bimester.bimestre !== 'string') {
            return { valid: false, error: 'Cada bimestre deve ter o campo "bimestre" (string)' }
          }
          if (!bimester.unidades || !Array.isArray(bimester.unidades)) {
            return { valid: false, error: 'Cada bimestre deve ter o campo "unidades" (array)' }
          }
          
          for (const unit of bimester.unidades) {
            if (!unit.unidade || typeof unit.unidade !== 'string') {
              return { valid: false, error: 'Cada unidade deve ter o campo "unidade" (string)' }
            }
            if (!unit.capitulos || !Array.isArray(unit.capitulos)) {
              return { valid: false, error: 'Cada unidade deve ter o campo "capitulos" (array de strings)' }
            }
          }
        }
      }
    } else if ('name' in disc) {
      return { valid: true, data: Array.isArray(data) ? data : [data] }
    } else {
      return { valid: false, error: 'Formato de JSON nao reconhecido' }
    }
  }
  
  return { valid: true, data: Array.isArray(data) ? data : [data] }
}

// Marcar unidade como concluida
export async function markUnitAsCompletedInDB(
  disciplineId: string, 
  yearId: string, 
  bimesterId: string, 
  unitId: string, 
  completed: boolean
): Promise<void> {
  const disciplines = await getDisciplinesFromDB()
  const discipline = disciplines.find(d => d.id === disciplineId)
  if (!discipline) return
  
  const year = discipline.years.find(y => y.id === yearId)
  if (!year) return
  
  const bimester = year.bimesters.find(b => b.id === bimesterId)
  if (!bimester) return
  
  const unit = bimester.units.find(u => u.id === unitId)
  if (!unit) return
  
  unit.chapters.forEach(chapter => {
    chapter.completed = completed
  })
  
  await saveDisciplineToDB(discipline)
}
