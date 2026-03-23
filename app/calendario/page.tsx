'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useDisciplines, useCalendarItems, useKanbanItems, useWorkbookItems, useCalendarEvents } from '@/hooks/use-production-data'
import { Discipline, CalendarItem, CalendarChapter, CalendarItemType, CalendarEvent, EVENT_TYPE_LABELS, KanbanItem, WorkbookItem } from '@/lib/types'
import { getSequentialUnitName, getStatusIndicator, KanbanStatusType } from '@/lib/utils'
import { EventModal } from '@/components/event-modal'
import { DayDetailModal } from '@/components/day-detail-modal'
import { ChevronLeft, ChevronRight, GripVertical, X, ChevronDown, BookOpen, Loader2, Calendar, CalendarDays, FileText, Filter, Plus, Flag, AlertCircle, Printer } from 'lucide-react'

const WEEKDAYS = ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta']
const WEEKDAYS_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom']

// Cores predefinidas para disciplinas
const DISCIPLINE_COLORS = [
  '#0891b2', // cyan/tiffany
  '#f97316', // orange
  '#8b5cf6', // violet
  '#10b981', // emerald
  '#ec4899', // pink
  '#eab308', // yellow
  '#3b82f6', // blue
  '#ef4444', // red
  '#14b8a6', // teal
  '#a855f7', // purple
]

function getDisciplineColor(disciplines: Discipline[], disciplineId: string): string {
  const index = disciplines.findIndex(d => d.id === disciplineId)
  if (index === -1) return DISCIPLINE_COLORS[0]
  return disciplines[index].color || DISCIPLINE_COLORS[index % DISCIPLINE_COLORS.length]
}

// Funcao para verificar se uma data esta dentro de um periodo de evento
function getEventsForDate(date: string, events: CalendarEvent[]): { periodEvents: CalendarEvent[], pointEvents: CalendarEvent[] } {
  const periodEvents: CalendarEvent[] = []
  const pointEvents: CalendarEvent[] = []
  
  events.forEach(event => {
    if (event.endDate) {
      // Evento de periodo
      if (date >= event.startDate && date <= event.endDate) {
        periodEvents.push(event)
      }
    } else {
      // Evento pontual
      if (date === event.startDate) {
        pointEvents.push(event)
      }
    }
  })
  
  return { periodEvents, pointEvents }
}

function getWeekDates(date: Date): Date[] {
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(date.setDate(diff))
  
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function getMonthDates(date: Date): Date[] {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  // Ajustar para comecar na segunda-feira
  const startDate = new Date(firstDay)
  const dayOfWeek = firstDay.getDay()
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  startDate.setDate(startDate.getDate() + diff)
  
  const dates: Date[] = []
  const currentDate = new Date(startDate)
  
  // Gerar 6 semanas para cobrir todo o mes
  for (let i = 0; i < 42; i++) {
    dates.push(new Date(currentDate))
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return dates
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

interface DragItem {
  type: 'calendar' | 'discipline'
  id?: string
  disciplineId: string
  disciplineName: string
  yearId: string
  yearName: string
  bimesterId: string
  bimesterName: string
  unitId: string
  unitName: string
  chapters: CalendarChapter[]
  itemType?: CalendarItemType
}

interface CalendarDayProps {
  date: Date
  items: CalendarItem[]
  events: CalendarEvent[]
  kanbanItems: KanbanItem[]
  workbookItems: WorkbookItem[]
  onDrop: (date: string, item: DragItem) => void
  onRemove: (id: string) => void
  onEventClick?: (event: CalendarEvent) => void
  onDayClick?: (date: Date) => void
  draggedItem: DragItem | null
  setDraggedItem: (item: DragItem | null) => void
  isMonthView?: boolean
  currentMonth?: number
  disciplines: Discipline[]
}

// Função para obter o status do Kanban/Workbook para um item do calendário
function getItemStatus(item: CalendarItem, kanbanItems: KanbanItem[], workbookItems: WorkbookItem[]): KanbanStatusType | null {
  if (item.itemType === 'content') {
    const kanbanItem = kanbanItems.find(k => k.unitId === item.unitId && k.disciplineId === item.disciplineId)
    return kanbanItem?.status as KanbanStatusType || null
  } else {
    const workbookItem = workbookItems.find(w => w.unitId === item.unitId && w.disciplineId === item.disciplineId)
    return workbookItem?.status as KanbanStatusType || null
  }
}

function CalendarDay({ date, items, events, kanbanItems, workbookItems, onDrop, onRemove, onEventClick, onDayClick, draggedItem, setDraggedItem, isMonthView, currentMonth, disciplines }: CalendarDayProps) {
  const [isOver, setIsOver] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const dateStr = formatDate(date)
  const dayItems = items.filter(item => item.date === dateStr)
  const { periodEvents, pointEvents } = getEventsForDate(dateStr, events)
  const isToday = formatDate(new Date()) === dateStr
  const isCurrentMonth = currentMonth === undefined || date.getMonth() === currentMonth
  const isWeekend = date.getDay() === 0 || date.getDay() === 6
  
  // Cor de fundo do periodo (bimestre tem prioridade)
  const bimesterEvent = periodEvents.find(e => e.eventType === 'bimester')
  const periodBgColor = bimesterEvent ? bimesterEvent.color + '15' : periodEvents[0]?.color + '10'

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!isWeekend) setIsOver(true)
  }, [isWeekend])

  const handleDragLeave = useCallback(() => {
    setIsOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsOver(false)
    if (draggedItem && !isWeekend) {
      onDrop(dateStr, draggedItem)
    }
  }, [dateStr, draggedItem, onDrop, isWeekend])

  const handleDragStart = useCallback((item: CalendarItem) => {
    setDraggedItem({
      type: 'calendar',
      id: item.id,
      disciplineId: item.disciplineId,
      disciplineName: item.disciplineName,
      yearId: item.yearId,
      yearName: item.yearName,
      bimesterId: item.bimesterId,
      bimesterName: item.bimesterName,
      unitId: item.unitId,
      unitName: item.unitName,
      chapters: item.chapters
    })
  }, [setDraggedItem])

  if (isMonthView) {
    return (
      <div
        className={`min-h-[80px] sm:min-h-[100px] border-r border-b border-border p-1 transition-colors ${
          isOver ? 'bg-primary/10' : ''
        } ${isToday ? 'ring-2 ring-primary ring-inset' : ''} ${
          !isCurrentMonth ? 'opacity-40' : ''
        } ${isWeekend ? 'bg-muted/20' : ''}`}
        style={{ backgroundColor: periodBgColor || undefined }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Cabecalho do dia com cor do bimestre - clicavel */}
        <div 
          className={`flex items-center justify-between mb-1 px-1 py-0.5 rounded-sm cursor-pointer hover:bg-muted/50 transition-colors ${bimesterEvent ? 'text-foreground' : ''}`}
          style={bimesterEvent ? { backgroundColor: bimesterEvent.color + '30' } : undefined}
          onClick={() => onDayClick?.(date)}
        >
          <span className={`text-xs font-medium ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
            {date.getDate()}
          </span>
          {bimesterEvent && (
            <span className="text-[8px] font-medium truncate max-w-[60px]" style={{ color: bimesterEvent.color }}>
              {bimesterEvent.title}
            </span>
          )}
        </div>
        
        {/* Eventos pontuais */}
        {pointEvents.length > 0 && (
          <div className="space-y-0.5 mb-1">
            {pointEvents.slice(0, 2).map(event => (
              <div
                key={event.id}
                onClick={() => onEventClick?.(event)}
                className="flex items-center gap-1 px-1 py-0.5 rounded text-[8px] cursor-pointer hover:opacity-80"
                style={{ backgroundColor: event.color + '30', color: event.color }}
              >
                <Flag className="h-2 w-2 flex-shrink-0" />
                <span className="truncate font-medium">{event.title}</span>
              </div>
            ))}
          </div>
        )}
        
        <div className="space-y-0.5">
          {dayItems.slice(0, 3).map((item) => {
            const color = getDisciplineColor(disciplines, item.disciplineId)
            const isWorkbook = item.itemType === 'workbook'
            const status = getItemStatus(item, kanbanItems, workbookItems)
            const statusIndicator = status ? getStatusIndicator(status) : null
            return (
              <div
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(item)}
                onDragEnd={() => setDraggedItem(null)}
                className="group relative rounded px-1 py-0.5 text-[9px] sm:text-[10px] cursor-grab active:cursor-grabbing"
                style={{ 
                  backgroundColor: isWorkbook ? '#f59e0b15' : '#3b82f615',
                  borderLeft: `3px solid ${color}`
                }}
                title={`${isWorkbook ? '[CA] ' : '[C] '}${getSequentialUnitName(item.bimesterName, item.unitName)} - ${item.disciplineName} (${item.yearName})${statusIndicator ? ` - ${statusIndicator.label}` : ''}`}
              >
                <div className="flex items-center gap-0.5">
                  {/* Badge tipo */}
                  <span 
                    className="text-[7px] sm:text-[8px] font-bold px-0.5 rounded flex-shrink-0"
                    style={{ 
                      backgroundColor: isWorkbook ? '#f59e0b30' : '#3b82f630',
                      color: isWorkbook ? '#d97706' : '#2563eb'
                    }}
                  >
                    {isWorkbook ? 'CA' : 'C'}
                  </span>
                  <span className="font-medium text-foreground truncate">{item.yearName}</span>
                  {/* Indicador de status */}
                  {statusIndicator && (
                    <span 
                      className="text-[6px] sm:text-[7px] font-medium px-0.5 rounded ml-auto flex-shrink-0"
                      style={{ backgroundColor: statusIndicator.bgColor, color: statusIndicator.color }}
                    >
                      {statusIndicator.shortLabel}
                    </span>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemove(item.id)
                  }}
                  className="absolute right-0.5 top-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            )
          })}
          {dayItems.length > 3 && (
            <div className="text-[9px] text-muted-foreground px-1">
              +{dayItems.length - 3} mais
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`min-w-[120px] flex-1 min-h-[200px] border-r border-border last:border-r-0 p-1 sm:p-2 transition-colors ${
        isOver ? 'bg-primary/10' : ''
      } ${isToday ? 'ring-2 ring-primary ring-inset' : ''}`}
      style={{ backgroundColor: periodBgColor || undefined }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Indicador de bimestre no topo - clicavel para abrir detalhes */}
      {bimesterEvent ? (
        <div 
          className="mb-2 px-2 py-1 rounded text-[10px] font-medium text-center cursor-pointer hover:opacity-80 transition-opacity"
          style={{ backgroundColor: bimesterEvent.color + '30', color: bimesterEvent.color }}
          onClick={() => onDayClick?.(date)}
        >
          {bimesterEvent.title}
        </div>
      ) : (
        <div 
          className="mb-2 px-2 py-1 rounded text-[10px] font-medium text-center cursor-pointer hover:bg-muted/50 transition-colors text-muted-foreground"
          onClick={() => onDayClick?.(date)}
        >
          Ver detalhes
        </div>
      )}
      
      {/* Eventos pontuais */}
      {pointEvents.length > 0 && (
        <div className="space-y-1 mb-2">
          {pointEvents.map(event => (
            <div
              key={event.id}
              onClick={() => onEventClick?.(event)}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] cursor-pointer hover:opacity-80"
              style={{ backgroundColor: event.color + '25', borderLeft: `3px solid ${event.color}` }}
            >
              <Flag className="h-3 w-3 flex-shrink-0" style={{ color: event.color }} />
              <span className="font-medium truncate" style={{ color: event.color }}>{event.title}</span>
            </div>
          ))}
        </div>
      )}
      
      <div className="space-y-1 sm:space-y-2">
        {dayItems.map((item) => {
          const isExpanded = expandedItems.has(item.id)
          const color = getDisciplineColor(disciplines, item.disciplineId)
          const isWorkbook = item.itemType === 'workbook'
          const status = getItemStatus(item, kanbanItems, workbookItems)
          const statusIndicator = status ? getStatusIndicator(status) : null
          return (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(item)}
              onDragEnd={() => setDraggedItem(null)}
              className="group relative rounded-md p-1.5 sm:p-2 text-[10px] sm:text-xs cursor-grab active:cursor-grabbing overflow-hidden"
              style={{ 
                backgroundColor: isWorkbook ? '#f59e0b10' : '#3b82f610', 
                borderLeft: `4px solid ${color}`
              }}
            >
              <div className="flex items-start gap-1">
                <GripVertical className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5 hidden sm:block" />
                <div className="flex-1 min-w-0 overflow-hidden">
                  {/* Badge tipo + Serie em destaque */}
                  <div className="flex items-center gap-1 mb-1 flex-wrap">
                    {/* Badge tipo C ou CA */}
                    <span 
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold"
                      style={{ 
                        backgroundColor: isWorkbook ? '#f59e0b30' : '#3b82f630',
                        color: isWorkbook ? '#d97706' : '#2563eb'
                      }}
                    >
                      {isWorkbook ? 'CA' : 'C'}
                    </span>
                    <span 
                      className="inline-block px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold"
                      style={{ backgroundColor: color + '30', color: color }}
                    >
                      {item.yearName}
                    </span>
                    {/* Indicador de status */}
                    {statusIndicator && (
                      <span 
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-medium ml-auto"
                        style={{ backgroundColor: statusIndicator.bgColor, color: statusIndicator.color }}
                      >
                        {statusIndicator.shortLabel}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleExpanded(item.id)
                      }}
                      className="text-muted-foreground hover:text-foreground flex-shrink-0"
                    >
                      <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                    </button>
                    <p className="font-medium text-foreground truncate text-[10px] sm:text-xs">{getSequentialUnitName(item.bimesterName, item.unitName)}</p>
                  </div>
                  <p className="text-muted-foreground truncate ml-4 text-[9px] sm:text-[10px]">{item.disciplineName}</p>
                  <p className="text-muted-foreground/70 truncate ml-4 text-[8px] sm:text-[10px] hidden sm:block">{item.bimesterName}</p>
                  
                  {isExpanded && (
                    <div className="mt-2 ml-4 space-y-1 border-t border-border/50 pt-2 max-h-32 overflow-y-auto">
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-medium">Capítulos:</p>
                      {item.chapters.map((chapter) => (
                        <div key={chapter.id} className="flex items-center gap-1 text-[9px] sm:text-[10px] text-foreground/80">
                          <BookOpen className="h-2.5 w-2.5 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{chapter.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemove(item.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive flex-shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              
              <div className="absolute bottom-1 right-1 sm:right-2 text-[8px] sm:text-[10px] text-muted-foreground/60">
                {item.chapters.length} cap.
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface DisciplineItemProps {
  discipline: Discipline
  setDraggedItem: (item: DragItem | null) => void
  color: string
}

function DisciplineItem({ discipline, setDraggedItem, color }: DisciplineItemProps) {
  const [expanded, setExpanded] = useState(false)
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set())
  const [expandedBimesters, setExpandedBimesters] = useState<Set<string>>(new Set())

  const toggleYear = (id: string) => {
    setExpandedYears(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleBimester = (id: string) => {
    setExpandedBimesters(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleUnitDragStart = (
    unit: { id: string; name: string; chapters: Chapter[] },
    year: { id: string; name: string },
    bimester: { id: string; name: string }
  ) => {
    setDraggedItem({
      type: 'discipline',
      disciplineId: discipline.id,
      disciplineName: discipline.name,
      yearId: year.id,
      yearName: year.name,
      bimesterId: bimester.id,
      bimesterName: bimester.name,
      unitId: unit.id,
      unitName: unit.name,
      chapters: unit.chapters.map(c => ({ id: c.id, name: c.name }))
    })
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
        style={{ borderLeft: `4px solid ${color}` }}
      >
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          <span>{discipline.name}</span>
        </div>
        <ChevronRight className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>
      
      {expanded && (
        <div className="border-t border-border bg-muted/20">
          {discipline.years.map((year) => (
            <div key={year.id} className="border-b border-border/50 last:border-b-0">
              <button
                onClick={() => toggleYear(year.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/30"
              >
                <ChevronDown className={`h-3 w-3 transition-transform ${expandedYears.has(year.id) ? '' : '-rotate-90'}`} />
                <span 
                  className="font-bold px-2 py-0.5 rounded"
                  style={{ backgroundColor: color + '20', color: color }}
                >
                  {year.name}
                </span>
              </button>
              
              {expandedYears.has(year.id) && (
                <div className="ml-4">
                  {year.bimesters.map((bimester) => (
                    <div key={bimester.id} className="border-t border-border/30">
                      <button
                        onClick={() => toggleBimester(bimester.id)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/30"
                      >
                        <ChevronDown className={`h-3 w-3 transition-transform ${expandedBimesters.has(bimester.id) ? '' : '-rotate-90'}`} />
                        {bimester.name}
                      </button>
                      
                      {expandedBimesters.has(bimester.id) && (
                        <div className="ml-4 py-1 space-y-1">
                          {bimester.units.map((unit) => (
                            <div
                              key={unit.id}
                              draggable
                              onDragStart={() => handleUnitDragStart(unit, year, bimester)}
                              onDragEnd={() => setDraggedItem(null)}
                              className="flex items-center gap-2 p-2 mx-2 rounded text-xs bg-card border border-border cursor-grab active:cursor-grabbing hover:bg-muted/50 transition-colors group"
                              style={{ borderLeftColor: color, borderLeftWidth: '2px' }}
                            >
                              <GripVertical className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground truncate">{getSequentialUnitName(bimester.name, unit.name)}</p>
                                <p className="text-muted-foreground text-[10px]">{unit.chapters.length} capítulo(s)</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

type ViewMode = 'week' | 'month'

type ItemTypeFilter = 'all' | 'content' | 'workbook'

// ─── Layout Mobile ──────────────────────────────────────────────────────────
interface MobileCalendarioProps {
  weekDates: Date[]
  filteredCalendarItems: CalendarItem[]
  events: CalendarEvent[]
  kanbanItems: KanbanItem[]
  workbookItems: WorkbookItem[]
  disciplines: Discipline[]
  itemTypeFilter: ItemTypeFilter
  setItemTypeFilter: (f: ItemTypeFilter) => void
  handlePrev: () => void
  handleNext: () => void
  handleToday: () => void
}

function MobileCalendarioView({
  weekDates,
  filteredCalendarItems,
  events,
  kanbanItems,
  workbookItems,
  disciplines,
  itemTypeFilter,
  setItemTypeFilter,
  handlePrev,
  handleNext,
  handleToday,
}: MobileCalendarioProps) {
  const todayStr = formatDate(new Date())
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const toggleItem = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Cabeçalho fixo */}
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-md border border-border hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-md border border-border hover:bg-muted"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted font-medium"
            >
              Hoje
            </button>
          </div>
          <span className="text-sm font-semibold text-foreground">
            {weekDates[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            {' – '}
            {weekDates[4].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>

        {/* Filtros */}
        <div className="flex border-t border-border">
          {([['all', 'Todos'], ['content', 'Conteúdo'], ['workbook', 'Caderno']] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setItemTypeFilter(val)}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                itemTypeFilter === val
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de dias */}
      <div className="flex-1 p-3 space-y-3">
        {weekDates.map((date, index) => {
          const dateStr = formatDate(date)
          const dayItems = filteredCalendarItems.filter(item => item.date === dateStr)
          const { periodEvents, pointEvents } = getEventsForDate(dateStr, events)
          const bimesterEvent = periodEvents.find(e => e.eventType === 'bimester')
          const isToday = dateStr === todayStr
          const hasContent = dayItems.length > 0 || pointEvents.length > 0

          return (
            <div
              key={dateStr}
              className={`rounded-xl border overflow-hidden ${
                isToday ? 'border-primary' : 'border-border'
              }`}
            >
              {/* Header do dia */}
              <div
                className={`flex items-center justify-between px-4 py-2.5 ${
                  isToday ? 'bg-primary/10' : bimesterEvent ? '' : 'bg-muted/30'
                }`}
                style={bimesterEvent ? { backgroundColor: bimesterEvent.color + '20' } : undefined}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${isToday ? 'text-primary' : 'text-foreground'}`}>
                    {WEEKDAYS[index]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </span>
                  {bimesterEvent && (
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: bimesterEvent.color + '30', color: bimesterEvent.color }}
                    >
                      {bimesterEvent.title}
                    </span>
                  )}
                </div>
                {hasContent && (
                  <span className="text-[10px] text-muted-foreground">
                    {dayItems.length + pointEvents.length} item(s)
                  </span>
                )}
              </div>

              {/* Conteúdo do dia */}
              {!hasContent ? (
                <p className="text-xs text-muted-foreground px-4 py-3">Nenhum item agendado</p>
              ) : (
                <div className="p-3 space-y-2 bg-card">
                  {/* Eventos pontuais */}
                  {pointEvents.map(event => (
                    <div
                      key={event.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                      style={{ backgroundColor: event.color + '20', borderLeft: `3px solid ${event.color}` }}
                    >
                      <Flag className="h-3 w-3 flex-shrink-0" style={{ color: event.color }} />
                      <span className="font-medium" style={{ color: event.color }}>{event.title}</span>
                    </div>
                  ))}

                  {/* Itens do calendário */}
                  {dayItems.map(item => {
                    const color = getDisciplineColor(disciplines, item.disciplineId)
                    const isWorkbook = item.itemType === 'workbook'
                    const status = getItemStatus(item, kanbanItems, workbookItems)
                    const statusIndicator = status ? getStatusIndicator(status) : null
                    const isExpanded = expandedItems.has(item.id)

                    return (
                      <div
                        key={item.id}
                        className="rounded-lg overflow-hidden text-xs"
                        style={{
                          backgroundColor: isWorkbook ? '#f59e0b10' : '#3b82f610',
                          borderLeft: `4px solid ${color}`,
                        }}
                      >
                        {/* Linha principal — clicável */}
                        <button
                          onClick={() => toggleItem(item.id)}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
                        >
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                            style={{
                              backgroundColor: isWorkbook ? '#f59e0b30' : '#3b82f630',
                              color: isWorkbook ? '#d97706' : '#2563eb',
                            }}
                          >
                            {isWorkbook ? 'CA' : 'C'}
                          </span>
                          <span
                            className="font-bold px-1.5 py-0.5 rounded text-[10px] flex-shrink-0"
                            style={{ backgroundColor: color + '25', color }}
                          >
                            {item.yearName}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {getSequentialUnitName(item.bimesterName, item.unitName)}
                            </p>
                            <p className="text-muted-foreground truncate text-[10px]">{item.disciplineName}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {statusIndicator && (
                              <span
                                className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                                style={{ backgroundColor: statusIndicator.bgColor, color: statusIndicator.color }}
                              >
                                {statusIndicator.shortLabel}
                              </span>
                            )}
                            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                          </div>
                        </button>

                        {/* Capítulos expandidos */}
                        {isExpanded && item.chapters.length > 0 && (
                          <div className="px-3 pb-3 pt-1 border-t border-border/30 space-y-1.5">
                            <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-wide">
                              Capítulos ({item.chapters.length})
                            </p>
                            {item.chapters.map(chapter => (
                              <div key={chapter.id} className="flex items-center gap-2 text-[11px] text-foreground/80">
                                <BookOpen className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <span>{chapter.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function CalendarioPage() {
  const isMobile = useIsMobile()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [itemTypeFilter, setItemTypeFilter] = useState<ItemTypeFilter>('all')
  const [addingItemType, setAddingItemType] = useState<CalendarItemType>('content')
  const { disciplines, loading: disciplinesLoading } = useDisciplines()
  const { calendarItems, loading: calendarLoading, addItem, updateDate, removeItem } = useCalendarItems()
  const { kanbanItems, loading: kanbanLoading } = useKanbanItems()
  const { workbookItems, loading: workbookLoading } = useWorkbookItems()
  const { events, loading: eventsLoading, addEvent, updateEvent, removeEvent } = useCalendarEvents()
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null)
  
  // Estado do modal de eventos
  const [showEventModal, setShowEventModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [selectedDateForEvent, setSelectedDateForEvent] = useState<string | undefined>()
  
  // Estado do modal de detalhes do dia
  const [showDayDetailModal, setShowDayDetailModal] = useState(false)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const loading = disciplinesLoading || calendarLoading || kanbanLoading || workbookLoading || eventsLoading

  // IDs de unidades já agendadas ou concluídas (baseado no tipo selecionado)
  const scheduledUnitIds = useMemo(() => {
    const ids = new Set<string>()
    // Unidades no calendário do tipo selecionado
    calendarItems
      .filter(item => item.itemType === addingItemType)
      .forEach(item => ids.add(item.unitId))
    // Unidades concluidas no Kanban correspondente
    if (addingItemType === 'content') {
      kanbanItems.filter(item => item.status === 'completed').forEach(item => ids.add(item.unitId))
    } else {
      workbookItems.filter(item => item.status === 'completed').forEach(item => ids.add(item.unitId))
    }
    return ids
  }, [calendarItems, kanbanItems, workbookItems, addingItemType])

  // Filtrar itens do calendário baseado no filtro
  const filteredCalendarItems = useMemo(() => {
    if (itemTypeFilter === 'all') return calendarItems
    return calendarItems.filter(item => item.itemType === itemTypeFilter)
  }, [calendarItems, itemTypeFilter])

  // Filtrar disciplinas para ocultar unidades já agendadas/concluídas
  const filteredDisciplines = useMemo(() => {
    return disciplines.map(discipline => ({
      ...discipline,
      years: discipline.years.map(year => ({
        ...year,
        bimesters: year.bimesters.map(bimester => ({
          ...bimester,
          units: bimester.units.filter(unit => !scheduledUnitIds.has(unit.id))
        })).filter(bimester => bimester.units.length > 0)
      })).filter(year => year.bimesters.length > 0)
    })).filter(discipline => discipline.years.length > 0)
  }, [disciplines, scheduledUnitIds])

  const weekDates = useMemo(() => getWeekDates(new Date(currentDate)), [currentDate])
  const monthDates = useMemo(() => getMonthDates(new Date(currentDate)), [currentDate])

  const handlePrev = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setMonth(newDate.getMonth() - 1)
    }
    setCurrentDate(newDate)
  }

  const handleNext = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const handleDrop = useCallback(async (date: string, item: DragItem) => {
    if (item.type === 'calendar' && item.id) {
      await updateDate(item.id, date)
    } else if (item.type === 'discipline') {
      const color = getDisciplineColor(disciplines, item.disciplineId)
      await addItem({
        date,
        disciplineId: item.disciplineId,
        disciplineName: item.disciplineName,
        yearId: item.yearId,
        yearName: item.yearName,
        bimesterId: item.bimesterId,
        bimesterName: item.bimesterName,
        unitId: item.unitId,
        unitName: item.unitName,
        chapters: item.chapters,
        color,
        itemType: addingItemType
      })
    }
    setDraggedItem(null)
  }, [addItem, updateDate, disciplines, addingItemType])

  const handleRemove = useCallback(async (id: string) => {
    await removeItem(id)
  }, [removeItem])

  const handleEventClick = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event)
    setSelectedDateForEvent(undefined)
    setShowEventModal(true)
  }, [])

  const handleAddEvent = useCallback(async (event: Omit<CalendarEvent, 'id' | 'createdAt'>) => {
    await addEvent(event)
  }, [addEvent])

  const handleUpdateEvent = useCallback(async (id: string, event: Partial<Omit<CalendarEvent, 'id' | 'createdAt'>>) => {
    await updateEvent(id, event)
  }, [updateEvent])

  const handleDeleteEvent = useCallback(async (id: string) => {
    await removeEvent(id)
  }, [removeEvent])

  const openNewEventModal = useCallback((date?: string) => {
    setSelectedEvent(null)
    setSelectedDateForEvent(date)
    setShowEventModal(true)
  }, [])

  const handleDayClick = useCallback((date: Date) => {
    setSelectedDay(date)
    setShowDayDetailModal(true)
  }, [])

  const handleAddEventFromDayModal = useCallback((dateStr: string) => {
    setShowDayDetailModal(false)
    setSelectedDateForEvent(dateStr)
    setSelectedEvent(null)
    setShowEventModal(true)
  }, [])

  const handleEventClickFromDayModal = useCallback((event: CalendarEvent) => {
    setShowDayDetailModal(false)
    setSelectedEvent(event)
    setSelectedDateForEvent(undefined)
    setShowEventModal(true)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isMobile) {
    return (
      <MobileCalendarioView
        weekDates={weekDates}
        filteredCalendarItems={filteredCalendarItems}
        events={events}
        kanbanItems={kanbanItems}
        workbookItems={workbookItems}
        disciplines={disciplines}
        itemTypeFilter={itemTypeFilter}
        setItemTypeFilter={setItemTypeFilter}
        handlePrev={handlePrev}
        handleNext={handleNext}
        handleToday={handleToday}
      />
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-[calc(100vh-8rem)] print-calendar-root">
      <div className="w-full lg:w-72 xl:w-80 flex-shrink-0 space-y-4 overflow-y-auto max-h-[200px] lg:max-h-none print-hide">
        <Card className="border-border bg-card">
          <CardHeader className="pb-3 p-3 lg:p-6 lg:pb-3">
            <CardTitle className="text-sm font-medium text-card-foreground flex items-center gap-2">
              {addingItemType === 'content' ? (
                <>
                  <FileText className="h-4 w-4 text-primary" />
                  Disciplinas - Conteudo
                </>
              ) : (
                <>
                  <BookOpen className="h-4 w-4 text-accent" />
                  Disciplinas - Caderno de Ativ.
                </>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Arraste as unidades para o calendário ({addingItemType === 'content' ? 'Conteúdo' : 'Caderno de Atividades'})
            </p>
          </CardHeader>
          <CardContent className="space-y-2 p-3 lg:p-6 pt-0 lg:pt-0">
            {disciplines.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma disciplina cadastrada. Acesse a pagina de Cadastro JSON para adicionar.
              </p>
            ) : filteredDisciplines.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todas as unidades já foram agendadas ou concluídas.
              </p>
            ) : (
              filteredDisciplines.map((discipline) => {
                const originalIndex = disciplines.findIndex(d => d.id === discipline.id)
                return (
                  <DisciplineItem
                    key={discipline.id}
                    discipline={discipline}
                    setDraggedItem={setDraggedItem}
                    color={discipline.color || DISCIPLINE_COLORS[originalIndex % DISCIPLINE_COLORS.length]}
                  />
                )
              })
            )}
          </CardContent>
        </Card>
        
        {/* Card de Eventos */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2 p-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Flag className="h-3 w-3" />
                Eventos
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => openNewEventModal()}
                className="h-6 px-2 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Novo
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {events.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum evento cadastrado.</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {events.map(event => (
                  <div 
                    key={event.id} 
                    onClick={() => handleEventClick(event)}
                    className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 rounded p-1.5 -mx-1 group"
                  >
                    <div 
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: event.color }} 
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-foreground truncate block">{event.title}</span>
                      <span className="text-muted-foreground text-[10px]">
                        {event.startDate.split('-').reverse().join('/')}
                        {event.endDate && ` - ${event.endDate.split('-').reverse().join('/')}`}
                      </span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground group-hover:bg-muted/80">
                      {EVENT_TYPE_LABELS[event.eventType]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Legenda de cores */}
        {disciplines.length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-2 p-3">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Legenda Disciplinas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="space-y-1">
                {disciplines.map((discipline, index) => (
                  <div key={discipline.id} className="flex items-center gap-2 text-xs">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: discipline.color || DISCIPLINE_COLORS[index % DISCIPLINE_COLORS.length] }} 
                    />
                    <span className="text-foreground truncate">{discipline.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2 print-hide">
          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="outline" size="icon" onClick={handlePrev} className="h-8 w-8 sm:h-9 sm:w-9">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleNext} className="h-8 w-8 sm:h-9 sm:w-9">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleToday} className="text-xs sm:text-sm">
              Hoje
            </Button>
            
            {/* Seletor de visualizacao */}
            <div className="flex items-center border border-border rounded-md overflow-hidden ml-2">
              <button
                onClick={() => setViewMode('week')}
                className={`px-2 sm:px-3 py-1.5 text-xs flex items-center gap-1 transition-colors ${
                  viewMode === 'week' ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-muted'
                }`}
              >
                <Calendar className="h-3 w-3" />
                <span className="hidden sm:inline">Semana</span>
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-2 sm:px-3 py-1.5 text-xs flex items-center gap-1 transition-colors ${
                  viewMode === 'month' ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-muted'
                }`}
              >
                <CalendarDays className="h-3 w-3" />
                <span className="hidden sm:inline">Mes</span>
              </button>
            </div>
          </div>
          
          {/* Filtros de tipo */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Filter className="h-3 w-3" />
              <span className="hidden sm:inline">Ver:</span>
            </div>
            <div className="flex items-center border border-border rounded-md overflow-hidden">
              <button
                onClick={() => setItemTypeFilter('all')}
                className={`px-2 sm:px-3 py-1.5 text-xs transition-colors ${
                  itemTypeFilter === 'all' ? 'bg-muted text-foreground' : 'bg-card text-muted-foreground hover:bg-muted/50'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setItemTypeFilter('content')}
                className={`px-2 sm:px-3 py-1.5 text-xs flex items-center gap-1 transition-colors ${
                  itemTypeFilter === 'content' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <FileText className="h-3 w-3" />
                <span className="hidden sm:inline">Conteudo</span>
              </button>
              <button
                onClick={() => setItemTypeFilter('workbook')}
                className={`px-2 sm:px-3 py-1.5 text-xs flex items-center gap-1 transition-colors ${
                  itemTypeFilter === 'workbook' ? 'bg-accent text-accent-foreground' : 'bg-card text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <BookOpen className="h-3 w-3" />
                <span className="hidden sm:inline">Caderno Ativ.</span>
              </button>
            </div>
            
            <div className="h-4 w-px bg-border mx-1" />
            
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="hidden sm:inline">Adicionar:</span>
            </div>
            <div className="flex items-center border border-border rounded-md overflow-hidden">
              <button
                onClick={() => setAddingItemType('content')}
                className={`px-2 sm:px-3 py-1.5 text-xs flex items-center gap-1 transition-colors ${
                  addingItemType === 'content' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <FileText className="h-3 w-3" />
                <span className="hidden sm:inline">Conteudo</span>
              </button>
              <button
                onClick={() => setAddingItemType('workbook')}
                className={`px-2 sm:px-3 py-1.5 text-xs flex items-center gap-1 transition-colors ${
                  addingItemType === 'workbook' ? 'bg-accent text-accent-foreground' : 'bg-card text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <BookOpen className="h-3 w-3" />
                <span className="hidden sm:inline">Caderno Ativ.</span>
              </button>
            </div>
            
            {/* Botao novo evento */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => openNewEventModal()}
              className="text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Novo Evento</span>
              <span className="sm:hidden">Evento</span>
            </Button>

            {/* Botao imprimir - apenas na visao semanal */}
            {viewMode === 'week' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="text-xs"
                title="Imprimir calendário semanal (A4 paisagem)"
              >
                <Printer className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Imprimir</span>
              </Button>
            )}
          </div>
          <h2 className="text-sm sm:text-lg font-semibold text-foreground">
            {viewMode === 'week' 
              ? weekDates[0].toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
              : currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
            }
          </h2>
        </div>

        <Card className="flex-1 border-border bg-card overflow-hidden print-calendar-card">
          {viewMode === 'week' ? (
            <>
              {/* Titulo visivel apenas na impressao */}
              <div className="print-show px-4 pt-3 pb-1">
                <h1 className="text-base font-bold text-foreground">
                  Calendário Semanal — {weekDates[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} a {weekDates[4].toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </h1>
              </div>

              <div className="flex border-b border-border overflow-x-auto print-hide">
                {WEEKDAYS.map((day, index) => (
                  <div
                    key={day}
                    className="min-w-[120px] flex-1 py-2 sm:py-3 px-1 sm:px-2 text-center border-r border-border last:border-r-0"
                  >
                    <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">{day}</p>
                    <p className={`text-sm sm:text-lg font-semibold ${
                      formatDate(weekDates[index]) === formatDate(new Date())
                        ? 'text-primary'
                        : 'text-foreground'
                    }`}>
                      {formatDisplayDate(weekDates[index])}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex h-[calc(100%-3.5rem)] sm:h-[calc(100%-4rem)] overflow-x-auto overflow-y-auto print-hide">
                {weekDates.map((date) => (
                  <div key={formatDate(date)} className="flex-1">
                    <CalendarDay
                      date={date}
                      items={filteredCalendarItems}
                      events={events}
                      kanbanItems={kanbanItems}
                      workbookItems={workbookItems}
                      onDrop={handleDrop}
                      onRemove={handleRemove}
                      onEventClick={handleEventClick}
                      onDayClick={handleDayClick}
                      draggedItem={draggedItem}
                      setDraggedItem={setDraggedItem}
                      disciplines={disciplines}
                    />
                  </div>
                ))}
              </div>

              {/* Lista para impressao - visivel apenas no print */}
              <div className="print-show print-list">
                {weekDates.map((date, index) => {
                  const dateStr = formatDate(date)
                  const dayItems = filteredCalendarItems.filter(item => item.date === dateStr)
                  const { pointEvents } = getEventsForDate(dateStr, events)
                  const hasContent = dayItems.length > 0 || pointEvents.length > 0
                  return (
                    <div key={dateStr} className="print-list-day">
                      <div className="print-list-day-header">
                        <span className="print-list-day-name">{WEEKDAYS[index]}</span>
                        <span className="print-list-day-date">{date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                      </div>
                      {!hasContent ? (
                        <p className="print-list-empty">Nenhum item agendado</p>
                      ) : (
                        <div className="print-list-items">
                          {pointEvents.map(event => (
                            <div key={event.id} className="print-list-event">
                              <span className="print-list-badge print-list-badge-event">Evento</span>
                              <span>{event.title}</span>
                            </div>
                          ))}
                          {dayItems.map(item => {
                            const color = getDisciplineColor(disciplines, item.disciplineId)
                            const isWorkbook = item.itemType === 'workbook'
                            return (
                              <div key={item.id} className="print-list-item" style={{ borderLeftColor: color }}>
                                <span className={`print-list-badge ${isWorkbook ? 'print-list-badge-ca' : 'print-list-badge-c'}`}>
                                  {isWorkbook ? 'CA' : 'C'}
                                </span>
                                <span className="print-list-year">{item.yearName}</span>
                                <span className="print-list-sep">—</span>
                                <span className="print-list-unit">{getSequentialUnitName(item.bimesterName, item.unitName)}</span>
                                <span className="print-list-sep">—</span>
                                <span className="print-list-discipline">{item.disciplineName}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-7 border-b border-border">
                {WEEKDAYS_SHORT.map((day) => (
                  <div
                    key={day}
                    className="py-2 px-1 text-center border-r border-border last:border-r-0"
                  >
                    <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase">{day}</p>
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 h-[calc(100%-2.5rem)] overflow-y-auto">
                {monthDates.map((date) => (
                  <CalendarDay
                    key={formatDate(date)}
                    date={date}
                    items={filteredCalendarItems}
                    events={events}
                    kanbanItems={kanbanItems}
                    workbookItems={workbookItems}
                    onDrop={handleDrop}
                    onRemove={handleRemove}
                    onEventClick={handleEventClick}
                    onDayClick={handleDayClick}
                    draggedItem={draggedItem}
                    setDraggedItem={setDraggedItem}
                    isMonthView={true}
                    currentMonth={currentDate.getMonth()}
                    disciplines={disciplines}
                  />
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
      
      {/* Modal de Eventos */}
      <EventModal
        isOpen={showEventModal}
        onClose={() => {
          setShowEventModal(false)
          setSelectedEvent(null)
          setSelectedDateForEvent(undefined)
        }}
        onSave={handleAddEvent}
        onUpdate={handleUpdateEvent}
        onDelete={handleDeleteEvent}
        event={selectedEvent}
        initialDate={selectedDateForEvent}
      />
      
      {/* Modal de Detalhes do Dia */}
      {selectedDay && (
        <DayDetailModal
          isOpen={showDayDetailModal}
          onClose={() => {
            setShowDayDetailModal(false)
            setSelectedDay(null)
          }}
          date={selectedDay}
          items={calendarItems.filter(item => item.date === selectedDay.toISOString().split('T')[0])}
          events={events}
          kanbanItems={kanbanItems}
          workbookItemsData={workbookItems}
          onRemoveItem={handleRemove}
          onEventClick={handleEventClickFromDayModal}
          onAddEvent={handleAddEventFromDayModal}
        />
      )}
    </div>
  )
}
