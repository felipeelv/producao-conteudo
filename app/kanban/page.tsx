'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useDisciplines, useKanbanItems, useCalendarItems } from '@/hooks/use-production-data'
import { Discipline, KanbanItem, KanbanStatus } from '@/lib/types'
import { getSequentialUnitName } from '@/lib/utils'
import { FileText, Layers, Printer, CheckCircle2, GripVertical, X, Plus, ChevronDown, ChevronRight, BookOpen, ChevronLeft, Filter, Loader2 } from 'lucide-react'

const COLUMNS: { id: KanbanStatus; title: string; icon: React.ElementType; color: string; borderColor: string }[] = [
  { id: 'production', title: 'Produção', icon: FileText, color: 'text-chart-3', borderColor: 'border-chart-3' },
  { id: 'layout', title: 'Diagramação', icon: Layers, color: 'text-chart-2', borderColor: 'border-chart-2' },
  { id: 'printing', title: 'Impressão', icon: Printer, color: 'text-chart-5', borderColor: 'border-chart-5' },
  { id: 'completed', title: 'Concluído', icon: CheckCircle2, color: 'text-primary', borderColor: 'border-primary' }
]

interface DragItem {
  id: string
  status: KanbanStatus
}

interface KanbanColumnProps {
  column: typeof COLUMNS[0]
  items: KanbanItem[]
  onDrop: (itemId: string, newStatus: KanbanStatus) => void
  onRemove: (id: string) => void
  draggedItem: DragItem | null
  setDraggedItem: (item: DragItem | null) => void
}

function KanbanColumn({ column, items, onDrop, onRemove, draggedItem, setDraggedItem }: KanbanColumnProps) {
  const [isOver, setIsOver] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const columnItems = items.filter(item => item.status === column.id)
  const Icon = column.icon

  const toggleExpand = (itemId: string) => {
    const newSet = new Set(expandedItems)
    if (newSet.has(itemId)) {
      newSet.delete(itemId)
    } else {
      newSet.add(itemId)
    }
    setExpandedItems(newSet)
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsOver(false)
    if (draggedItem && draggedItem.status !== column.id) {
      onDrop(draggedItem.id, column.id)
    }
  }, [column.id, draggedItem, onDrop])

  return (
    <div className="flex-1 min-w-[260px]">
      <div className={`flex items-center gap-2 mb-4 pb-3 border-b-2 ${column.borderColor}`}>
        <Icon className={`h-5 w-5 ${column.color}`} />
        <h2 className="font-semibold text-foreground">{column.title}</h2>
        <span className="ml-auto rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {columnItems.length}
        </span>
      </div>

      <div
        className={`min-h-[400px] rounded-lg border-2 border-dashed p-2 transition-colors ${
          isOver ? 'border-primary bg-primary/5' : 'border-transparent'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="space-y-2">
          {columnItems.map((item) => {
            const isExpanded = expandedItems.has(item.id)
            const chapterCount = item.chapters?.length || 0
            
            return (
              <Card
                key={item.id}
                draggable
                onDragStart={() => setDraggedItem({ id: item.id, status: item.status })}
                onDragEnd={() => setDraggedItem(null)}
                className={`cursor-grab active:cursor-grabbing border-border bg-card hover:bg-muted/30 transition-colors group ${
                  column.id === 'completed' ? 'opacity-80' : ''
                }`}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleExpand(item.id)
                          }}
                          className="p-0.5 hover:bg-muted rounded transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          )}
                        </button>
                        <p className={`font-medium text-sm truncate flex-1 ${column.id === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                          {getSequentialUnitName(item.bimesterName, item.unitName)}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground ml-5">
                        {chapterCount} capítulo(s)
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground ml-5">
                        <span>{item.yearName}</span>
                        <span>-</span>
                        <span>{item.bimesterName}</span>
                      </div>
                      
                      {isExpanded && item.chapters && item.chapters.length > 0 && (
                        <div className="mt-2 ml-5 space-y-1 border-l-2 border-border pl-2">
                          {item.chapters.map((chapter, idx) => (
                            <p 
                              key={chapter.id || idx} 
                              className={`text-xs ${column.id === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground/80'}`}
                            >
                              {chapter.name}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => onRemove(item.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          
          {columnItems.length === 0 && !isOver && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Icon className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">
                Arraste itens para cá
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface AddUnitsModalProps {
  discipline: Discipline
  existingItems: KanbanItem[]
  scheduledUnitIds: Set<string>
  onAdd: (items: Omit<KanbanItem, 'id' | 'createdAt'>[]) => void
  onClose: () => void
}

function AddUnitsModal({ discipline, existingItems, scheduledUnitIds, onAdd, onClose }: AddUnitsModalProps) {
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set())
  const [expandedBimesters, setExpandedBimesters] = useState<Set<string>>(new Set())
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set())

  const toggleExpand = (set: Set<string>, setFn: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) => {
    const newSet = new Set(set)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setFn(newSet)
  }

  const toggleUnit = (unitId: string) => {
    const newSet = new Set(selectedUnits)
    if (newSet.has(unitId)) {
      newSet.delete(unitId)
    } else {
      newSet.add(unitId)
    }
    setSelectedUnits(newSet)
  }

  const isUnitAlreadyAdded = (unitId: string) => {
    // Verifica se já está no kanban ou no calendário
    return existingItems.some(item => item.unitId === unitId && item.disciplineId === discipline.id) ||
           scheduledUnitIds.has(unitId)
  }

  const handleAdd = () => {
    const itemsToAdd: Omit<KanbanItem, 'id' | 'createdAt'>[] = []
    
    discipline.years.forEach(year => {
      year.bimesters.forEach(bimester => {
        bimester.units.forEach(unit => {
          if (selectedUnits.has(unit.id) && !isUnitAlreadyAdded(unit.id)) {
            itemsToAdd.push({
              disciplineId: discipline.id,
              disciplineName: discipline.name,
              yearId: year.id,
              yearName: year.name,
              bimesterId: bimester.id,
              bimesterName: bimester.name,
              unitId: unit.id,
              unitName: unit.name,
              chapters: unit.chapters.map(c => ({ id: c.id, name: c.name })),
              status: 'production'
            })
          }
        })
      })
    })
    
    if (itemsToAdd.length > 0) {
      onAdd(itemsToAdd)
    }
    onClose()
  }

  const selectAllUnits = () => {
    const allUnits = new Set<string>()
    discipline.years.forEach(year => {
      year.bimesters.forEach(bimester => {
        bimester.units.forEach(unit => {
          if (!isUnitAlreadyAdded(unit.id)) {
            allUnits.add(unit.id)
          }
        })
      })
    })
    setSelectedUnits(allUnits)
  }

  const deselectAllUnits = () => {
    setSelectedUnits(new Set())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-2xl max-h-[80vh] border-border bg-card flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="text-card-foreground flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Adicionar Unidades - {discipline.name}
          </CardTitle>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={selectAllUnits}>
              Selecionar Todas
            </Button>
            <Button variant="outline" size="sm" onClick={deselectAllUnits}>
              Desmarcar Todas
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-2">
          {discipline.years.map(year => (
            <div key={year.id} className="border border-border rounded-lg overflow-hidden">
              <button
                className="w-full flex items-center gap-2 p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                onClick={() => toggleExpand(expandedYears, setExpandedYears, year.id)}
              >
                {expandedYears.has(year.id) ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium text-foreground">{year.name}</span>
              </button>
              
              {expandedYears.has(year.id) && (
                <div className="p-2 space-y-2">
                  {year.bimesters.map(bimester => (
                    <div key={bimester.id} className="ml-4 border border-border rounded">
                      <button
                        className="w-full flex items-center gap-2 p-2 bg-muted/20 hover:bg-muted/40 transition-colors"
                        onClick={() => toggleExpand(expandedBimesters, setExpandedBimesters, bimester.id)}
                      >
                        {expandedBimesters.has(bimester.id) ? (
                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className="text-sm text-foreground">{bimester.name}</span>
                      </button>
                      
                      {expandedBimesters.has(bimester.id) && (
                        <div className="p-2 space-y-1">
                          {bimester.units.map(unit => {
                            const alreadyAdded = isUnitAlreadyAdded(unit.id)
                            const isSelected = selectedUnits.has(unit.id)
                            
                            return (
                              <div
                                key={unit.id}
                                className={`ml-4 p-2 rounded border cursor-pointer transition-colors ${
                                  alreadyAdded 
                                    ? 'bg-muted/50 border-muted cursor-not-allowed opacity-50'
                                    : isSelected 
                                      ? 'bg-primary/10 border-primary'
                                      : 'bg-card border-border hover:bg-muted/30'
                                }`}
                                onClick={() => !alreadyAdded && toggleUnit(unit.id)}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-foreground">{getSequentialUnitName(bimester.name, unit.name)}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {unit.chapters.length} capitulo(s)
                                      {alreadyAdded && ' - Já adicionado'}
                                    </p>
                                  </div>
                                  {!alreadyAdded && (
                                    <div className={`h-4 w-4 rounded border ${
                                      isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                                    }`}>
                                      {isSelected && (
                                        <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
        <div className="flex gap-2 p-4 border-t border-border flex-shrink-0">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            className="flex-1" 
            onClick={handleAdd}
            disabled={selectedUnits.size === 0}
          >
            Adicionar {selectedUnits.size} unidade(s)
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default function KanbanPage() {
  const { disciplines, loading: disciplinesLoading } = useDisciplines()
  const { kanbanItems, loading: kanbanLoading, addItem, updateStatus, removeItem, setKanbanItems } = useKanbanItems()
  const { calendarItems, loading: calendarLoading } = useCalendarItems()
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('all')
  const [selectedBimester, setSelectedBimester] = useState<string>('all')

  const loading = disciplinesLoading || kanbanLoading || calendarLoading

  // IDs de unidades já agendadas no calendário
  const scheduledUnitIds = new Set(calendarItems.map(item => item.unitId))

  const handleDrop = useCallback(async (itemId: string, newStatus: KanbanStatus) => {
    await updateStatus(itemId, newStatus)
    setDraggedItem(null)
  }, [updateStatus])

  const handleRemove = useCallback(async (id: string) => {
    await removeItem(id)
  }, [removeItem])

  const handleAddUnits = useCallback(async (items: Omit<KanbanItem, 'id' | 'createdAt'>[]) => {
    for (const item of items) {
      await addItem(item)
    }
  }, [addItem])

  // Obter lista de bimestres unicos dos itens no kanban
  const availableBimesters = Array.from(
    new Set(
      kanbanItems
        .filter(item => selectedDiscipline === 'all' || item.disciplineId === selectedDiscipline)
        .map(item => item.bimesterName)
    )
  ).sort()

  const filteredItems = kanbanItems.filter(item => {
    const matchesDiscipline = selectedDiscipline === 'all' || item.disciplineId === selectedDiscipline
    const matchesBimester = selectedBimester === 'all' || item.bimesterName === selectedBimester
    return matchesDiscipline && matchesBimester
  })

  const currentDiscipline = disciplines.find(d => d.id === selectedDiscipline)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const scrollTabs = (direction: 'left' | 'right') => {
    const container = document.getElementById('discipline-tabs')
    if (container) {
      const scrollAmount = 200
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Abas de disciplinas com scroll */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          onClick={() => scrollTabs('left')}
          className="p-2 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          aria-label="Rolar para esquerda"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        
        <div 
          id="discipline-tabs"
          className="flex items-center gap-2 overflow-x-auto pb-0 scrollbar-hide flex-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
              selectedDiscipline === 'all'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => {
              setSelectedDiscipline('all')
              setSelectedBimester('all')
            }}
          >
            Todas ({kanbanItems.length})
          </button>
          {disciplines.map(discipline => {
            const count = kanbanItems.filter(item => item.disciplineId === discipline.id).length
            return (
              <button
                key={discipline.id}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                  selectedDiscipline === discipline.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => {
                  setSelectedDiscipline(discipline.id)
                  setSelectedBimester('all')
                }}
              >
                {discipline.name} ({count})
              </button>
            )
          })}
        </div>
        
        <button
          onClick={() => scrollTabs('right')}
          className="p-2 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          aria-label="Rolar para direita"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Filtro por bimestre */}
      {availableBimesters.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Bimestre:</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                selectedBimester === 'all'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-foreground border-border hover:bg-muted'
              }`}
              onClick={() => setSelectedBimester('all')}
            >
              Todos
            </button>
            {availableBimesters.map(bimester => {
              const count = kanbanItems.filter(item => 
                (selectedDiscipline === 'all' || item.disciplineId === selectedDiscipline) &&
                item.bimesterName === bimester
              ).length
              return (
                <button
                  key={bimester}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    selectedBimester === bimester
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-foreground border-border hover:bg-muted'
                  }`}
                  onClick={() => setSelectedBimester(bimester)}
                >
                  {bimester} ({count})
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Resumo e acoes */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {COLUMNS.map((col, index) => (
            <div key={col.id} className="flex items-center gap-2">
              {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className={`h-3 w-3 rounded-full ${
                  col.id === 'production' ? 'bg-chart-3' :
                  col.id === 'layout' ? 'bg-chart-2' :
                  col.id === 'printing' ? 'bg-chart-5' : 'bg-primary'
                }`} />
                <span>{col.title} ({filteredItems.filter(i => i.status === col.id).length})</span>
              </div>
            </div>
          ))}
        </div>
        
        <Button 
          onClick={() => setShowAddModal(true)} 
          disabled={disciplines.length === 0 || selectedDiscipline === 'all'}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Unidades
        </Button>
      </div>

      {selectedDiscipline === 'all' && disciplines.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Selecione uma disciplina nas abas acima para adicionar unidades ao Kanban.
        </p>
      )}

      {disciplines.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground">Nenhuma disciplina cadastrada</p>
            <p className="text-sm text-muted-foreground mt-1">
              Acesse a pagina de Cadastro JSON para adicionar disciplinas
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              items={filteredItems}
              onDrop={handleDrop}
              onRemove={handleRemove}
              draggedItem={draggedItem}
              setDraggedItem={setDraggedItem}
            />
          ))}
        </div>
      )}

      {showAddModal && currentDiscipline && (
        <AddUnitsModal
          discipline={currentDiscipline}
          existingItems={kanbanItems}
          scheduledUnitIds={scheduledUnitIds}
          onAdd={handleAddUnits}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  )
}
