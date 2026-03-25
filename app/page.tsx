'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useIsMobile } from '@/hooks/use-mobile'
import { useDisciplines, useKanbanItems, useWorkbookItems, useCalendarItems, useProductionStats } from '@/hooks/use-production-data'
import { KanbanItem, WorkbookItem, CalendarItem, Discipline } from '@/lib/types'
import { getSequentialUnitName, getStatusIndicator, KanbanStatusType } from '@/lib/utils'
import { BookOpen, CheckCircle2, Layers, Printer, FileText, TrendingUp, CheckCheck, AlertTriangle, Clock, CalendarDays } from 'lucide-react'

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color 
}: { 
  title: string
  value: number
  subtitle?: string
  icon: React.ElementType
  color: string
}) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`rounded-lg p-2 ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-card-foreground">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}

function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const percentage = max > 0 ? (value / max) * 100 : 0
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{value}/{max}</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div 
          className="h-2 rounded-full bg-primary transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function RecentActivity({ items }: { items: KanbanItem[] }) {
  const recentItems = items.slice(-5).reverse()
  
  const statusLabels: Record<string, string> = {
    production: 'Produção',
    layout: 'Diagramação',
    printing: 'Impressão',
    completed: 'Concluído'
  }
  
  const statusColors: Record<string, string> = {
    production: 'bg-chart-3 text-warning-foreground',
    layout: 'bg-chart-2 text-foreground',
    printing: 'bg-chart-5 text-foreground',
    completed: 'bg-primary text-primary-foreground'
  }
  
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-card-foreground">Atividade Recente</CardTitle>
      </CardHeader>
      <CardContent>
        {recentItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma atividade recente</p>
        ) : (
          <div className="space-y-4">
            {recentItems.map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <div className={`mt-1 rounded px-2 py-0.5 text-xs font-medium ${statusColors[item.status]}`}>
                  {statusLabels[item.status]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {getSequentialUnitName(item.bimesterName, item.unitName)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.disciplineName} - {item.yearName}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface DeadlineAlert {
  id: string
  type: 'content' | 'workbook'
  unitName: string
  disciplineName: string
  yearName: string
  bimesterName: string
  date: string
  daysRemaining: number
  status: string | null
}

function DeadlineAlerts({ 
  calendarItems, 
  kanbanItems, 
  workbookItems 
}: { 
  calendarItems: CalendarItem[]
  kanbanItems: KanbanItem[]
  workbookItems: WorkbookItem[]
}) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // Calcular alertas
  const alerts: DeadlineAlert[] = calendarItems
    .map(item => {
      const itemDate = new Date(item.date + 'T00:00:00')
      const diffTime = itemDate.getTime() - today.getTime()
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      // Buscar status do item
      let status: KanbanStatusType | null = null
      if (item.itemType === 'content') {
        const kanbanItem = kanbanItems.find(k => k.unitId === item.unitId && k.disciplineId === item.disciplineId)
        status = kanbanItem?.status as KanbanStatusType || null
      } else {
        const workbookItem = workbookItems.find(w => w.unitId === item.unitId && w.disciplineId === item.disciplineId)
        status = workbookItem?.status as KanbanStatusType || null
      }
      
      // Ignorar itens já concluídos ou em impressão (diagramação já garantida)
      if (status === 'completed' || status === 'printing') return null
      
      return {
        id: item.id,
        type: item.itemType,
        unitName: item.unitName,
        disciplineName: item.disciplineName,
        yearName: item.yearName,
        bimesterName: item.bimesterName,
        date: item.date,
        daysRemaining,
        status
      }
    })
    .filter((alert): alert is NonNullable<typeof alert> => alert !== null)
    .filter(alert => alert.daysRemaining <= 7) // Mostrar apenas próximos 7 dias ou atrasados
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
  
  const criticalAlerts = alerts.filter(a => a.daysRemaining < 0)
  const urgentAlerts = alerts.filter(a => a.daysRemaining >= 0 && a.daysRemaining <= 3)
  const attentionAlerts = alerts.filter(a => a.daysRemaining > 3 && a.daysRemaining <= 7)
  
  const getPriorityStyle = (days: number) => {
    if (days < 0) return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600', label: 'Atrasado' }
    if (days <= 3) return { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-600', label: 'Urgente' }
    return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-600', label: 'Atenção' }
  }
  
  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-')
    return `${day}/${month}`
  }
  
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Alertas de Prazo
          {alerts.length > 0 && (
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {criticalAlerts.length > 0 && <span className="text-red-500 mr-2">{criticalAlerts.length} atrasado(s)</span>}
              {urgentAlerts.length > 0 && <span className="text-orange-500">{urgentAlerts.length} urgente(s)</span>}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle2 className="h-12 w-12 mx-auto text-primary/50 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum prazo próximo ou atrasado</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {alerts.slice(0, 10).map(alert => {
              const style = getPriorityStyle(alert.daysRemaining)
              const statusIndicator = alert.status ? getStatusIndicator(alert.status as KanbanStatusType) : null
              
              return (
                <div 
                  key={alert.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${style.bg} ${style.border}`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {alert.daysRemaining < 0 ? (
                      <AlertTriangle className={`h-4 w-4 ${style.text}`} />
                    ) : (
                      <Clock className={`h-4 w-4 ${style.text}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span 
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ 
                          backgroundColor: alert.type === 'workbook' ? '#f59e0b30' : '#3b82f630',
                          color: alert.type === 'workbook' ? '#d97706' : '#2563eb'
                        }}
                      >
                        {alert.type === 'workbook' ? 'CA' : 'C'}
                      </span>
                      <span className="text-xs font-medium text-foreground truncate">
                        {getSequentialUnitName(alert.bimesterName, alert.unitName)}
                      </span>
                      {statusIndicator && (
                        <span 
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded ml-auto"
                          style={{ backgroundColor: statusIndicator.bgColor, color: statusIndicator.color }}
                        >
                          {statusIndicator.shortLabel}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {alert.disciplineName} - {alert.yearName}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className={`text-xs font-bold ${style.text}`}>
                      {alert.daysRemaining < 0 
                        ? `${Math.abs(alert.daysRemaining)}d atrás`
                        : alert.daysRemaining === 0 
                          ? 'Hoje'
                          : `${alert.daysRemaining}d`
                      }
                    </p>
                    <p className="text-[10px] text-muted-foreground">{formatDate(alert.date)}</p>
                  </div>
                </div>
              )
            })}
            {alerts.length > 10 && (
              <p className="text-xs text-center text-muted-foreground pt-2">
                +{alerts.length - 10} mais alertas
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PrintingQueue({
  kanbanItems,
  workbookItems
}: {
  kanbanItems: KanbanItem[]
  workbookItems: WorkbookItem[]
}) {
  const contentPrinting = kanbanItems.filter(i => i.status === 'printing')
  const workbookPrinting = workbookItems.filter(i => i.status === 'printing')
  const total = contentPrinting.length + workbookPrinting.length

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
          <Printer className="h-5 w-5 text-purple-500" />
          Fila de Impressão
          {total > 0 && (
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {total} unidade{total !== 1 ? 's' : ''}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="text-center py-6">
            <CheckCircle2 className="h-12 w-12 mx-auto text-primary/50 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma unidade aguardando impressão</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Conteúdo */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-600">C</span>
                <span className="text-xs font-medium text-muted-foreground">Conteúdo ({contentPrinting.length})</span>
              </div>
              {contentPrinting.length === 0 ? (
                <p className="text-xs text-muted-foreground pl-1">Nenhum</p>
              ) : (
                <div className="space-y-1.5">
                  {contentPrinting.map(item => (
                    <div key={item.id} className="flex flex-col rounded-lg border border-purple-500/20 bg-purple-500/5 px-3 py-2">
                      <span className="text-xs font-medium text-foreground">
                        {getSequentialUnitName(item.bimesterName, item.unitName)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{item.disciplineName} - {item.yearName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Caderno de Atividades */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600">CA</span>
                <span className="text-xs font-medium text-muted-foreground">Caderno de Ativ. ({workbookPrinting.length})</span>
              </div>
              {workbookPrinting.length === 0 ? (
                <p className="text-xs text-muted-foreground pl-1">Nenhum</p>
              ) : (
                <div className="space-y-1.5">
                  {workbookPrinting.map(item => (
                    <div key={item.id} className="flex flex-col rounded-lg border border-purple-500/20 bg-purple-500/5 px-3 py-2">
                      <span className="text-xs font-medium text-foreground">
                        {getSequentialUnitName(item.bimesterName, item.unitName)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{item.disciplineName} - {item.yearName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DisciplinesList({ disciplines }: { disciplines: Discipline[] }) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-card-foreground">Disciplinas Cadastradas</CardTitle>
      </CardHeader>
      <CardContent>
        {disciplines.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma disciplina cadastrada</p>
        ) : (
          <div className="space-y-3">
            {disciplines.map((discipline) => {
              let totalChapters = 0
              let completedChapters = 0
              
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
              
              return (
                <div key={discipline.id} className="rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-foreground">{discipline.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {discipline.years.length} ano(s)
                    </span>
                  </div>
                  <ProgressBar 
                    value={completedChapters} 
                    max={totalChapters} 
                    label="Capítulos completos"
                  />
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const isMobile = useIsMobile()

  useEffect(() => {
    if (isMobile) {
      router.replace('/calendario')
    }
  }, [isMobile, router])

  const { stats, loading: statsLoading } = useProductionStats()
  const { disciplines, loading: disciplinesLoading } = useDisciplines()
  const { kanbanItems, loading: kanbanLoading } = useKanbanItems()
  const { workbookItems, loading: workbookLoading } = useWorkbookItems()
  const { calendarItems, loading: calendarLoading } = useCalendarItems()

  const loading = statsLoading || disciplinesLoading || kanbanLoading || workbookLoading || calendarLoading
  
  // Calcular estatísticas de Caderno de Atividades
  const workbookStats = {
    total: workbookItems.length,
    inProduction: workbookItems.filter(i => i.status === 'production').length,
    inLayout: workbookItems.filter(i => i.status === 'layout').length,
    inPrinting: workbookItems.filter(i => i.status === 'printing').length,
    inCompleted: workbookItems.filter(i => i.status === 'completed').length
  }

  if (isMobile) return null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  const completionRate = stats.totalChapters > 0 
    ? Math.round((stats.completedChapters / stats.totalChapters) * 100) 
    : 0

  return (
    <div className="space-y-6">
      {/* Estatísticas de Conteúdo */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-600 text-xs font-bold">C</span>
          Conteúdo
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="Total de Capítulos"
            value={stats.totalChapters}
            subtitle={`${completionRate}% completos`}
            icon={BookOpen}
            color="bg-blue-500/10 text-blue-600"
          />
          <StatCard
            title="Em Produção"
            value={stats.inProduction}
            subtitle="Unidades sendo produzidas"
            icon={FileText}
            color="bg-yellow-500/10 text-yellow-600"
          />
          <StatCard
            title="Em Diagramação"
            value={stats.inLayout}
            subtitle="Unidades em diagramação"
            icon={Layers}
            color="bg-blue-500/10 text-blue-600"
          />
          <StatCard
            title="Em Impressão"
            value={stats.inPrinting}
            subtitle="Unidades para impressão"
            icon={Printer}
            color="bg-purple-500/10 text-purple-600"
          />
          <StatCard
            title="Concluídos"
            value={stats.inCompleted}
            subtitle="Unidades finalizadas"
            icon={CheckCheck}
            color="bg-green-500/10 text-green-600"
          />
        </div>
      </div>
      
      {/* Estatísticas de Caderno de Atividades */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 text-xs font-bold">CA</span>
          Caderno de Atividades
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="Total de Unidades"
            value={workbookStats.total}
            subtitle="No sistema"
            icon={BookOpen}
            color="bg-amber-500/10 text-amber-600"
          />
          <StatCard
            title="Em Produção"
            value={workbookStats.inProduction}
            subtitle="Unidades sendo produzidas"
            icon={FileText}
            color="bg-yellow-500/10 text-yellow-600"
          />
          <StatCard
            title="Em Diagramação"
            value={workbookStats.inLayout}
            subtitle="Unidades em diagramação"
            icon={Layers}
            color="bg-blue-500/10 text-blue-600"
          />
          <StatCard
            title="Em Impressão"
            value={workbookStats.inPrinting}
            subtitle="Unidades para impressão"
            icon={Printer}
            color="bg-purple-500/10 text-purple-600"
          />
          <StatCard
            title="Concluídos"
            value={workbookStats.inCompleted}
            subtitle="Unidades finalizadas"
            icon={CheckCheck}
            color="bg-green-500/10 text-green-600"
          />
        </div>
      </div>

      {/* Alertas de Prazo e Fila de Impressão */}
      <div className="grid gap-4 md:grid-cols-2">
        <DeadlineAlerts
          calendarItems={calendarItems}
          kanbanItems={kanbanItems}
          workbookItems={workbookItems}
        />
        <PrintingQueue kanbanItems={kanbanItems} workbookItems={workbookItems} />
      </div>

      {/* Progresso */}
      <div className="grid gap-4">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
              <TrendingUp className="h-5 w-5 text-primary" />
              Progresso Geral (Conteúdo)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ProgressBar 
              value={stats.completedChapters} 
              max={stats.totalChapters} 
              label="Capítulos Finalizados"
            />
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-yellow-500/10 p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.inProduction}</div>
                <div className="text-xs text-muted-foreground">Produção</div>
              </div>
              <div className="rounded-lg border border-border bg-blue-500/10 p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.inLayout}</div>
                <div className="text-xs text-muted-foreground">Diagramação</div>
              </div>
              <div className="rounded-lg border border-border bg-purple-500/10 p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.inPrinting}</div>
                <div className="text-xs text-muted-foreground">Impressão</div>
              </div>
              <div className="rounded-lg border border-border bg-green-500/10 p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.inCompleted}</div>
                <div className="text-xs text-muted-foreground">Concluídos</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Atividade Recente */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <RecentActivity items={kanbanItems} />
        
        <Card className="border-border bg-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
              <CalendarDays className="h-5 w-5 text-amber-500" />
              Progresso Geral (Caderno de Atividades)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ProgressBar 
              value={workbookStats.inCompleted} 
              max={workbookStats.total} 
              label="Unidades Finalizadas"
            />
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-yellow-500/10 p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">{workbookStats.inProduction}</div>
                <div className="text-xs text-muted-foreground">Produção</div>
              </div>
              <div className="rounded-lg border border-border bg-blue-500/10 p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{workbookStats.inLayout}</div>
                <div className="text-xs text-muted-foreground">Diagramação</div>
              </div>
              <div className="rounded-lg border border-border bg-purple-500/10 p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{workbookStats.inPrinting}</div>
                <div className="text-xs text-muted-foreground">Impressão</div>
              </div>
              <div className="rounded-lg border border-border bg-green-500/10 p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{workbookStats.inCompleted}</div>
                <div className="text-xs text-muted-foreground">Concluídos</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <DisciplinesList disciplines={disciplines} />
        
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Resumo de Conclusao
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-6">
              <div className="relative h-32 w-32">
                <svg className="h-32 w-32 -rotate-90 transform">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${completionRate * 3.52} 352`}
                    className="text-primary transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold text-foreground">{completionRate}%</span>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                {stats.completedChapters} de {stats.totalChapters} capitulos concluidos
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
