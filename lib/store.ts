'use client'

import { 
  Discipline, 
  KanbanItem, 
  KanbanChapter,
  CalendarItem, 
  ProductionStats, 
  KanbanStatus,
  ImportedDiscipline,
  Chapter,
  Unit,
  Bimester,
  Year
} from './types'

const DISCIPLINES_KEY = 'production-disciplines'
const KANBAN_KEY = 'production-kanban'
const CALENDAR_KEY = 'production-calendar'

export function getDisciplines(): Discipline[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(DISCIPLINES_KEY)
  return data ? JSON.parse(data) : []
}

export function saveDisciplines(disciplines: Discipline[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(DISCIPLINES_KEY, JSON.stringify(disciplines))
}

export function getKanbanItems(): KanbanItem[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(KANBAN_KEY)
  if (!data) return []
  
  const items = JSON.parse(data)
  
  // Migracao: converter formato antigo (chapterId/chapterName) para novo (chapters array)
  let needsSave = false
  const migratedItems = items.map((item: KanbanItem & { chapterId?: string; chapterName?: string }) => {
    // Se ja tem chapters array, nao precisa migrar
    if (item.chapters && Array.isArray(item.chapters)) {
      return item
    }
    
    // Converter formato antigo para novo
    needsSave = true
    const chapters: KanbanChapter[] = []
    
    // Tentar recuperar os capitulos da disciplina original
    const disciplines = getDisciplinesRaw()
    const discipline = disciplines.find(d => d.id === item.disciplineId)
    if (discipline) {
      const year = discipline.years.find(y => y.id === item.yearId)
      if (year) {
        const bimester = year.bimesters.find(b => b.id === item.bimesterId)
        if (bimester) {
          const unit = bimester.units.find(u => u.id === item.unitId)
          if (unit) {
            unit.chapters.forEach(c => {
              chapters.push({ id: c.id, name: c.name })
            })
          }
        }
      }
    }
    
    // Remover campos antigos e adicionar novo formato
    const { chapterId, chapterName, ...rest } = item
    return {
      ...rest,
      chapters
    }
  })
  
  // Salvar itens migrados se necessario
  if (needsSave) {
    localStorage.setItem(KANBAN_KEY, JSON.stringify(migratedItems))
  }
  
  return migratedItems
}

// Funcao auxiliar para obter disciplinas sem processamento (evita loop infinito)
function getDisciplinesRaw(): Discipline[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(DISCIPLINES_KEY)
  return data ? JSON.parse(data) : []
}

export function saveKanbanItems(items: KanbanItem[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KANBAN_KEY, JSON.stringify(items))
}

export function addKanbanItem(item: Omit<KanbanItem, 'id' | 'createdAt'>): KanbanItem {
  const items = getKanbanItems()
  const newItem: KanbanItem = {
    ...item,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString()
  }
  items.push(newItem)
  saveKanbanItems(items)
  return newItem
}

export function updateKanbanItemStatus(id: string, status: KanbanStatus): void {
  const items = getKanbanItems()
  const index = items.findIndex(item => item.id === id)
  if (index !== -1) {
    items[index].status = status
    saveKanbanItems(items)
    
    // Se moveu para "completed", marca todos os capitulos como concluidos no controle de producao
    if (status === 'completed') {
      const item = items[index]
      markUnitAsCompleted(item.disciplineId, item.yearId, item.bimesterId, item.unitId, true)
    }
  }
}

// Marca todos os capitulos de uma unidade como concluidos ou nao
export function markUnitAsCompleted(
  disciplineId: string, 
  yearId: string, 
  bimesterId: string, 
  unitId: string, 
  completed: boolean
): void {
  const disciplines = getDisciplines()
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
  
  saveDisciplines(disciplines)
}

export function removeKanbanItem(id: string): void {
  const items = getKanbanItems().filter(item => item.id !== id)
  saveKanbanItems(items)
}

export function getCalendarItems(): CalendarItem[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(CALENDAR_KEY)
  return data ? JSON.parse(data) : []
}

export function saveCalendarItems(items: CalendarItem[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(CALENDAR_KEY, JSON.stringify(items))
}

export function addCalendarItem(item: Omit<CalendarItem, 'id'>): CalendarItem {
  const items = getCalendarItems()
  const newItem: CalendarItem = {
    ...item,
    id: crypto.randomUUID()
  }
  items.push(newItem)
  saveCalendarItems(items)
  return newItem
}

export function updateCalendarItem(id: string, date: string): void {
  const items = getCalendarItems()
  const index = items.findIndex(item => item.id === id)
  if (index !== -1) {
    items[index].date = date
    saveCalendarItems(items)
  }
}

export function removeCalendarItem(id: string): void {
  const items = getCalendarItems().filter(item => item.id !== id)
  saveCalendarItems(items)
}

export function toggleChapterCompletion(disciplineId: string, yearId: string, bimesterId: string, unitId: string, chapterId: string): void {
  const disciplines = getDisciplines()
  const discipline = disciplines.find(d => d.id === disciplineId)
  if (!discipline) return
  
  const year = discipline.years.find(y => y.id === yearId)
  if (!year) return
  
  const bimester = year.bimesters.find(b => b.id === bimesterId)
  if (!bimester) return
  
  const unit = bimester.units.find(u => u.id === unitId)
  if (!unit) return
  
  const chapter = unit.chapters.find(c => c.id === chapterId)
  if (!chapter) return
  
  chapter.completed = !chapter.completed
  saveDisciplines(disciplines)
}

export function getProductionStats(): ProductionStats {
  const disciplines = getDisciplines()
  const kanbanItems = getKanbanItems()
  
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

// Funcao para gerar ID unico baseado no nome
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

// Converte o formato do JSON do usuario para o formato interno
export function convertImportedDiscipline(imported: ImportedDiscipline): Discipline {
  const disciplineId = generateId('disc', imported.disciplina)
  
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

// Valida o formato do JSON importado
export function validateImportedJSON(data: unknown): { valid: boolean; error?: string; data?: ImportedDiscipline | ImportedDiscipline[] } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'JSON invalido' }
  }
  
  // Verifica se e um array de disciplinas ou uma unica disciplina
  const disciplines = Array.isArray(data) ? data : [data]
  
  for (const disc of disciplines) {
    // Verifica se tem o formato novo (com "disciplina") ou o formato antigo (com "name")
    if ('disciplina' in disc) {
      // Formato novo do usuario
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
            
            for (const chapter of unit.capitulos) {
              if (typeof chapter !== 'string') {
                return { valid: false, error: 'Cada capitulo deve ser uma string' }
              }
            }
          }
        }
      }
    } else if ('name' in disc) {
      // Formato antigo - ja validado pelo sistema anterior
      return { valid: true, data: Array.isArray(data) ? data : [data] }
    } else {
      return { valid: false, error: 'Formato de JSON nao reconhecido. Use o formato com "disciplina", "anos", "bimestres", "unidades" e "capitulos"' }
    }
  }
  
  return { valid: true, data: Array.isArray(data) ? data : [data] }
}
