'use client'

import { CalendarItem, CalendarEvent, EVENT_TYPE_LABELS, KanbanItem, WorkbookItem } from '@/lib/types'
import { getSequentialUnitName, getStatusIndicator, KanbanStatusType } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { X, FileText, BookOpen, Flag, Calendar, Trash2, Plus } from 'lucide-react'

interface DayDetailModalProps {
  isOpen: boolean
  onClose: () => void
  date: Date
  items: CalendarItem[]
  events: CalendarEvent[]
  kanbanItems: KanbanItem[]
  workbookItemsData: WorkbookItem[]
  onRemoveItem: (id: string) => void
  onEventClick: (event: CalendarEvent) => void
  onAddEvent: (date: string) => void
}

// Função para obter o status do Kanban/Workbook para um item do calendário
function getItemStatus(item: CalendarItem, kanbanItems: KanbanItem[], workbookItemsData: WorkbookItem[]): KanbanStatusType | null {
  if (item.itemType === 'content') {
    const kanbanItem = kanbanItems.find(k => k.unitId === item.unitId && k.disciplineId === item.disciplineId)
    return kanbanItem?.status as KanbanStatusType || null
  } else {
    const workbookItem = workbookItemsData.find(w => w.unitId === item.unitId && w.disciplineId === item.disciplineId)
    return workbookItem?.status as KanbanStatusType || null
  }
}

export function DayDetailModal({
  isOpen,
  onClose,
  date,
  items,
  events,
  kanbanItems,
  workbookItemsData,
  onRemoveItem,
  onEventClick,
  onAddEvent
}: DayDetailModalProps) {
  if (!isOpen) return null

  const dateStr = date.toISOString().split('T')[0]
  const formattedDate = date.toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  })

  // Separar itens por tipo
  const contentItems = items.filter(item => item.itemType === 'content')
  const workbookItems = items.filter(item => item.itemType === 'workbook')
  
  // Separar eventos
  const periodEvents = events.filter(e => e.endDate && dateStr >= e.startDate && dateStr <= e.endDate)
  const pointEvents = events.filter(e => !e.endDate && e.startDate === dateStr)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-card border border-border rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold text-foreground capitalize">
                {formattedDate}
              </h2>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(85vh-8rem)] space-y-6">
          {/* Eventos de Periodo (Bimestres) */}
          {periodEvents.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Flag className="h-4 w-4" />
                Periodo Ativo
              </h3>
              <div className="space-y-2">
                {periodEvents.map(event => (
                  <div
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    style={{ backgroundColor: event.color + '15', borderLeft: `4px solid ${event.color}` }}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {EVENT_TYPE_LABELS[event.eventType]} - {event.startDate.split('-').reverse().join('/')} ate {event.endDate?.split('-').reverse().join('/')}
                      </p>
                      {event.description && (
                        <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Eventos Pontuais */}
          {pointEvents.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Flag className="h-4 w-4" />
                Eventos do Dia
              </h3>
              <div className="space-y-2">
                {pointEvents.map(event => (
                  <div
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    style={{ backgroundColor: event.color + '20', borderLeft: `4px solid ${event.color}` }}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{EVENT_TYPE_LABELS[event.eventType]}</p>
                      {event.description && (
                        <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conteudos */}
          {contentItems.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Conteudos ({contentItems.length})
              </h3>
              <div className="space-y-2">
                {contentItems.map(item => {
                  const status = getItemStatus(item, kanbanItems, workbookItemsData)
                  const statusIndicator = status ? getStatusIndicator(status) : null
                  return (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-3 rounded-lg group"
                      style={{ backgroundColor: '#3b82f615', borderLeft: `4px solid ${item.color}` }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {/* Badge C */}
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-600">
                            C
                          </span>
                          <span 
                            className="text-xs font-bold px-2 py-0.5 rounded"
                            style={{ backgroundColor: item.color + '30', color: item.color }}
                          >
                            {item.yearName}
                          </span>
                          {/* Status indicator */}
                          {statusIndicator && (
                            <span 
                              className="text-xs font-medium px-2 py-0.5 rounded ml-auto"
                              style={{ backgroundColor: statusIndicator.bgColor, color: statusIndicator.color }}
                            >
                              {statusIndicator.label}
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-foreground">
                          {getSequentialUnitName(item.bimesterName, item.unitName)}
                        </p>
                        <p className="text-sm text-muted-foreground">{item.disciplineName}</p>
                        <p className="text-xs text-muted-foreground/70">{item.bimesterName}</p>
                        {item.chapters.length > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <span className="font-medium">{item.chapters.length} capítulo(s):</span>
                            <ul className="mt-1 ml-3 space-y-0.5">
                              {item.chapters.slice(0, 3).map(ch => (
                                <li key={ch.id} className="truncate">- {ch.name}</li>
                              ))}
                              {item.chapters.length > 3 && (
                                <li className="text-muted-foreground/70">+{item.chapters.length - 3} mais...</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Cadernos de Atividades */}
          {workbookItems.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Caderno de Atividades ({workbookItems.length})
              </h3>
              <div className="space-y-2">
                {workbookItems.map(item => {
                  const status = getItemStatus(item, kanbanItems, workbookItemsData)
                  const statusIndicator = status ? getStatusIndicator(status) : null
                  return (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-3 rounded-lg group"
                      style={{ 
                        backgroundColor: '#f59e0b15', 
                        borderLeft: `4px solid ${item.color}`
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {/* Badge CA */}
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-600">
                            CA
                          </span>
                          <span 
                            className="text-xs font-bold px-2 py-0.5 rounded"
                            style={{ backgroundColor: item.color + '30', color: item.color }}
                          >
                            {item.yearName}
                          </span>
                          {/* Status indicator */}
                          {statusIndicator && (
                            <span 
                              className="text-xs font-medium px-2 py-0.5 rounded ml-auto"
                              style={{ backgroundColor: statusIndicator.bgColor, color: statusIndicator.color }}
                            >
                              {statusIndicator.label}
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-foreground">
                          {getSequentialUnitName(item.bimesterName, item.unitName)}
                        </p>
                        <p className="text-sm text-muted-foreground">{item.disciplineName}</p>
                        <p className="text-xs text-muted-foreground/70">{item.bimesterName}</p>
                        {item.chapters.length > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <span className="font-medium">{item.chapters.length} capítulo(s):</span>
                            <ul className="mt-1 ml-3 space-y-0.5">
                              {item.chapters.slice(0, 3).map(ch => (
                                <li key={ch.id} className="truncate">- {ch.name}</li>
                              ))}
                              {item.chapters.length > 3 && (
                                <li className="text-muted-foreground/70">+{item.chapters.length - 3} mais...</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Estado vazio */}
          {periodEvents.length === 0 && pointEvents.length === 0 && contentItems.length === 0 && workbookItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum item agendado para este dia.</p>
              <p className="text-sm mt-1">Arraste unidades para ca ou adicione um evento.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30 flex justify-between">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onAddEvent(dateStr)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Novo Evento
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  )
}
