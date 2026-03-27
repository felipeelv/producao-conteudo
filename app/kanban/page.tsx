'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useDisciplines, useKanbanItems, useCalendarItems } from '@/hooks/use-production-data'
import { Discipline, KanbanItem, KanbanStatus } from '@/lib/types'
import { getSequentialUnitName } from '@/lib/utils'
import { FileText, Layers, Printer, CheckCircle2, GripVertical, X, Plus, ChevronDown, ChevronRight, BookOpen, ChevronLeft, Filter, Loader2, ShieldCheck, ShieldAlert, Download } from 'lucide-react'
import { UserIdentifier } from '@/components/user-identifier'

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
  onToggleApproval: (id: string, approved: boolean) => void
  isMobile?: boolean
  draggedItem: DragItem | null
  setDraggedItem: (item: DragItem | null) => void
}

function KanbanColumn({ column, items, onDrop, onRemove, onToggleApproval, isMobile, draggedItem, setDraggedItem }: KanbanColumnProps) {
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

  const nextColumns = COLUMNS.filter(c => c.id !== column.id)

  return (
    <div className={isMobile ? 'w-full' : 'flex-1 min-w-[260px]'}>
      {!isMobile && (
        <div className={`flex items-center gap-2 mb-4 pb-3 border-b-2 ${column.borderColor}`}>
          <Icon className={`h-5 w-5 ${column.color}`} />
          <h2 className="font-semibold text-foreground">{column.title}</h2>
          <span className="ml-auto rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {columnItems.length}
          </span>
        </div>
      )}

      <div
        className={`rounded-lg border-2 border-dashed p-2 transition-colors ${
          isMobile ? 'min-h-[200px]' : 'min-h-[400px]'
        } ${isOver ? 'border-primary bg-primary/5' : 'border-transparent'}`}
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
                draggable={!isMobile}
                onDragStart={() => !isMobile && setDraggedItem({ id: item.id, status: item.status })}
                onDragEnd={() => !isMobile && setDraggedItem(null)}
                className={`py-0 overflow-hidden border-border bg-card transition-colors group ${
                  isMobile ? '' : 'cursor-grab active:cursor-grabbing hover:bg-muted/30'
                } ${column.id === 'completed' ? 'opacity-80' : ''}`}
              >
                <CardContent className="p-3">
                  {/* Badge da disciplina em destaque */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 border border-primary/20 min-w-0">
                      <BookOpen className="h-3 w-3 flex-shrink-0 text-primary" />
                      <span className="text-xs font-semibold text-primary truncate">{item.disciplineName}</span>
                    </div>
                    <button
                      onClick={() => onRemove(item.id)}
                      className={`text-muted-foreground hover:text-destructive flex-shrink-0 transition-opacity ${
                        isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-start gap-2">
                    {!isMobile && (
                      <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                    )}
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

                      {/* Mover para (mobile only) */}
                      {isMobile && column.id !== 'completed' && (
                        <div className="mt-2 ml-5 flex items-center gap-1 flex-wrap">
                          <span className="text-xs text-muted-foreground">Mover para:</span>
                          {nextColumns.map(col => {
                            const ColIcon = col.icon
                            return (
                              <button
                                key={col.id}
                                onClick={() => onDrop(item.id, col.id)}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors bg-card hover:bg-muted ${col.borderColor} ${col.color}`}
                              >
                                <ColIcon className="h-3 w-3" />
                                {col.title}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rodapé de aprovação para impressão */}
                  {column.id === 'printing' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleApproval(item.id, !item.printApproved)
                      }}
                      className={`mt-3 -mx-3 -mb-3 w-[calc(100%+1.5rem)] flex items-center justify-center gap-2 py-2 text-xs font-semibold border-t transition-colors rounded-b-lg ${
                        item.printApproved
                          ? 'bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20'
                          : 'bg-orange-500/10 text-orange-600 border-orange-500/20 hover:bg-orange-500/20'
                      }`}
                    >
                      {item.printApproved ? (
                        <>
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Aprovado para impressão
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="h-3.5 w-3.5" />
                          Aguardando aprovação
                        </>
                      )}
                    </button>
                  )}
                </CardContent>
              </Card>
            )
          })}

          {columnItems.length === 0 && !isOver && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Icon className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">
                {isMobile ? 'Nenhum item aqui' : 'Arraste itens para cá'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const COLUMN_COLORS: Record<KanbanStatus, { hex: string; label: string }> = {
  production: { hex: '#f59e0b', label: 'Produção' },
  layout: { hex: '#3b82f6', label: 'Diagramação' },
  printing: { hex: '#8b5cf6', label: 'Impressão' },
  completed: { hex: '#22c55e', label: 'Concluído' }
}

interface ExportPDFModalProps {
  items: KanbanItem[]
  onClose: () => void
}

function ExportPDFModal({ items, onClose }: ExportPDFModalProps) {
  const [selectedStages, setSelectedStages] = useState<Set<KanbanStatus>>(
    new Set(['production', 'layout', 'printing', 'completed'])
  )
  const [selectedDisciplines, setSelectedDisciplines] = useState<Set<string>>(
    new Set(items.map(i => i.disciplineName))
  )
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(
    new Set(items.map(i => getSequentialUnitName(i.bimesterName, i.unitName)))
  )

  const allDisciplines = Array.from(new Set(items.map(i => i.disciplineName))).sort()
  const allUnits = Array.from(new Set(items.map(i => getSequentialUnitName(i.bimesterName, i.unitName)))).sort()

  const toggleStage = (stage: KanbanStatus) => {
    const next = new Set(selectedStages)
    if (next.has(stage)) next.delete(stage)
    else next.add(stage)
    setSelectedStages(next)
  }

  const toggleDiscipline = (name: string) => {
    const next = new Set(selectedDisciplines)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    setSelectedDisciplines(next)
  }

  const toggleUnit = (name: string) => {
    const next = new Set(selectedUnits)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    setSelectedUnits(next)
  }

  const exportableItems = items.filter(
    i => selectedStages.has(i.status) &&
         selectedDisciplines.has(i.disciplineName) &&
         selectedUnits.has(getSequentialUnitName(i.bimesterName, i.unitName))
  )

  // Agrupar por disciplina
  const grouped = new Map<string, KanbanItem[]>()
  for (const item of exportableItems) {
    const list = grouped.get(item.disciplineName) || []
    list.push(item)
    grouped.set(item.disciplineName, list)
  }

  const handleExport = () => {
    const now = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })

    let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Relatório Kanban</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 32px; color: #1a1a1a; font-size: 13px; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .subtitle { font-size: 12px; color: #666; margin-bottom: 20px; }
        .legend { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
        .legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #555; }
        .legend-dot { width: 10px; height: 10px; border-radius: 50%; }
        .discipline { margin-bottom: 20px; page-break-inside: avoid; }
        .discipline-header { font-size: 15px; font-weight: 700; padding: 8px 12px; background: #f0f0f0; border-radius: 6px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; }
        .discipline-header .count { font-size: 11px; font-weight: 400; color: #888; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
        th { text-align: left; padding: 5px 10px; background: #fafafa; border: 1px solid #e0e0e0; font-weight: 600; font-size: 11px; text-transform: uppercase; color: #666; }
        td { padding: 5px 10px; border: 1px solid #e0e0e0; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; color: #fff; }
        .footer { margin-top: 28px; font-size: 10px; color: #aaa; border-top: 1px solid #e0e0e0; padding-top: 8px; }
        @media print { body { padding: 16px; } }
      </style></head><body>
      <h1>Relatório de Produção — Kanban</h1>
      <p class="subtitle">Gerado em ${now}</p>
      <div class="legend">`

    for (const stage of Array.from(selectedStages)) {
      const c = COLUMN_COLORS[stage]
      html += `<div class="legend-item"><span class="legend-dot" style="background:${c.hex};"></span>${c.label}</div>`
    }
    html += `</div>`

    for (const [disciplineName, discItems] of grouped) {
      // Ordenar por ano, bimestre, unidade
      discItems.sort((a, b) =>
        a.yearName.localeCompare(b.yearName) ||
        a.bimesterName.localeCompare(b.bimesterName) ||
        a.unitName.localeCompare(b.unitName)
      )

      html += `<div class="discipline">
        <div class="discipline-header">
          ${disciplineName}
          <span class="count">${discItems.length} unidade(s)</span>
        </div>
        <table><thead><tr>
          <th>Ano</th><th>Bimestre</th><th>Unidade</th><th>Etapa</th><th style="text-align:center;">Status</th>
        </tr></thead><tbody>`

      for (const item of discItems) {
        const c = COLUMN_COLORS[item.status]
        const statusEmoji = item.status === 'printing'
          ? (item.printApproved ? '✅' : '⏳')
          : ''
        html += `<tr>
          <td>${item.yearName}</td>
          <td>${item.bimesterName}</td>
          <td>${getSequentialUnitName(item.bimesterName, item.unitName)}</td>
          <td><span class="badge" style="background:${c.hex};">${c.label}</span></td>
          <td style="text-align:center;font-size:16px;">${statusEmoji}</td>
        </tr>`
      }
      html += `</tbody></table></div>`
    }

    html += `<div class="footer">Colégio Eleve — Sistema de Produção de Conteúdo</div></body></html>`

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.onload = () => printWindow.print()
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm p-0 sm:p-4">
      <Card className="w-full sm:max-w-lg max-h-[90vh] sm:max-h-[80vh] border-border bg-card flex flex-col rounded-b-none sm:rounded-lg">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="text-card-foreground flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar Relatório PDF
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Escolha o que incluir no relatório</p>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-5">
          {/* Etapas */}
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Etapas</p>
            <div className="flex flex-wrap gap-2">
              {COLUMNS.map(col => {
                const active = selectedStages.has(col.id)
                const Icon = col.icon
                return (
                  <button
                    key={col.id}
                    onClick={() => toggleStage(col.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full border transition-colors ${
                      active
                        ? `${col.borderColor} ${col.color} bg-primary/10`
                        : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {col.title}
                    <span className="text-xs">({items.filter(i => i.status === col.id && selectedDisciplines.has(i.disciplineName)).length})</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Disciplinas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-foreground">Disciplinas</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedDisciplines(new Set(allDisciplines))}
                  className="text-xs text-primary hover:underline"
                >
                  Todas
                </button>
                <button
                  onClick={() => setSelectedDisciplines(new Set())}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  Nenhuma
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {allDisciplines.map(name => {
                const active = selectedDisciplines.has(name)
                const count = items.filter(i => i.disciplineName === name && selectedStages.has(i.status)).length
                return (
                  <button
                    key={name}
                    onClick={() => toggleDiscipline(name)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-muted-foreground border-border hover:bg-muted'
                    }`}
                  >
                    {name} ({count})
                  </button>
                )
              })}
            </div>
          </div>

          {/* Unidades */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-foreground">Unidades</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedUnits(new Set(allUnits))}
                  className="text-xs text-primary hover:underline"
                >
                  Todas
                </button>
                <button
                  onClick={() => setSelectedUnits(new Set())}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  Nenhuma
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {allUnits.map(name => {
                const active = selectedUnits.has(name)
                const count = items.filter(i =>
                  getSequentialUnitName(i.bimesterName, i.unitName) === name &&
                  selectedStages.has(i.status) &&
                  selectedDisciplines.has(i.disciplineName)
                ).length
                return (
                  <button
                    key={name}
                    onClick={() => toggleUnit(name)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-muted-foreground border-border hover:bg-muted'
                    }`}
                  >
                    {name} ({count})
                  </button>
                )
              })}
            </div>
          </div>

          {/* Preview resumo */}
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">
              O relatório incluirá <strong className="text-foreground">{exportableItems.length}</strong> unidade(s)
              de <strong className="text-foreground">{grouped.size}</strong> disciplina(s),
              agrupadas por disciplina com a etapa de cada unidade.
            </p>
          </div>
        </CardContent>
        <div className="flex gap-2 p-4 border-t border-border flex-shrink-0">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="flex-1"
            onClick={handleExport}
            disabled={exportableItems.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar ({exportableItems.length})
          </Button>
        </div>
      </Card>
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
              status: 'production',
              printApproved: false
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm p-0 sm:p-4">
      <Card className="w-full sm:max-w-2xl max-h-[90vh] sm:max-h-[80vh] border-border bg-card flex flex-col rounded-b-none sm:rounded-lg">
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
  const { kanbanItems, loading: kanbanLoading, addItem, updateStatus, removeItem, updatePrintApproval, setKanbanItems } = useKanbanItems()
  const { calendarItems, loading: calendarLoading } = useCalendarItems()
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('all')
  const [selectedBimester, setSelectedBimester] = useState<string>('all')
  const [mobileColumn, setMobileColumn] = useState<KanbanStatus>('production')

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

  const handleToggleApproval = useCallback(async (id: string, approved: boolean) => {
    await updatePrintApproval(id, approved)
  }, [updatePrintApproval])

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

  const [showExportModal, setShowExportModal] = useState(false)

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
      {/* Header com UserIdentifier */}
      <div className="flex flex-wrap justify-between items-center gap-3 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Kanban - Conteúdos</h1>
            <p className="text-sm text-muted-foreground">Gerencie a produção dos conteúdos</p>
          </div>
        </div>
        <UserIdentifier />
      </div>

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {COLUMNS.map((col, index) => (
            <div key={col.id} className="flex items-center gap-2">
              {index > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground hidden sm:block" />}
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                  col.id === 'production' ? 'bg-chart-3' :
                  col.id === 'layout' ? 'bg-chart-2' :
                  col.id === 'printing' ? 'bg-chart-5' : 'bg-primary'
                }`} />
                <span className="hidden sm:inline">{col.title} </span>
                <span>({filteredItems.filter(i => i.status === col.id).length})</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowExportModal(true)}
            disabled={filteredItems.length === 0}
            size="sm"
            variant="outline"
          >
            <Download className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Exportar PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>

          <Button
            onClick={() => setShowAddModal(true)}
            disabled={disciplines.length === 0 || selectedDiscipline === 'all'}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Adicionar Unidades</span>
            <span className="sm:hidden">Adicionar</span>
          </Button>
        </div>
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
        <>
          {/* Seletor de coluna — mobile only */}
          <div className="grid grid-cols-4 gap-1 sm:hidden">
            {COLUMNS.map(col => {
              const ColIcon = col.icon
              const count = filteredItems.filter(i => i.status === col.id).length
              return (
                <button
                  key={col.id}
                  onClick={() => setMobileColumn(col.id)}
                  className={`flex flex-col items-center gap-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    mobileColumn === col.id
                      ? `${col.borderColor} bg-muted/50 ${col.color}`
                      : 'border-border text-muted-foreground hover:bg-muted/30'
                  }`}
                >
                  <ColIcon className="h-4 w-4" />
                  <span className="truncate w-full text-center px-1">{col.title}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    mobileColumn === col.id ? 'bg-primary/20' : 'bg-muted'
                  }`}>{count}</span>
                </button>
              )
            })}
          </div>

          {/* Coluna única — mobile */}
          <div className="sm:hidden">
            {COLUMNS.filter(col => col.id === mobileColumn).map(column => (
              <KanbanColumn
                key={column.id}
                column={column}
                items={filteredItems}
                onDrop={handleDrop}
                onRemove={handleRemove}
                onToggleApproval={handleToggleApproval}
                isMobile
                draggedItem={draggedItem}
                setDraggedItem={setDraggedItem}
              />
            ))}
          </div>

          {/* Todas as colunas lado a lado — desktop */}
          <div className="hidden sm:flex gap-4 overflow-x-auto pb-4">
            {COLUMNS.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                items={filteredItems}
                onDrop={handleDrop}
                onRemove={handleRemove}
                onToggleApproval={handleToggleApproval}
                draggedItem={draggedItem}
                setDraggedItem={setDraggedItem}
              />
            ))}
          </div>
        </>
      )}

      {showExportModal && (
        <ExportPDFModal
          items={filteredItems}
          onClose={() => setShowExportModal(false)}
        />
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
