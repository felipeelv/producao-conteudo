'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { useDisciplines } from '@/hooks/use-production-data'
import { Discipline } from '@/lib/types'
import { getSequentialUnitName } from '@/lib/utils'
import { BookOpen, ChevronDown, ChevronRight, CheckCircle2, Circle, Loader2 } from 'lucide-react'

interface ExpandedState {
  [key: string]: boolean
}

export default function ControlePage() {
  const { disciplines, loading, saveDiscipline, setDisciplines } = useDisciplines()
  const [expandedDisciplines, setExpandedDisciplines] = useState<ExpandedState>({})
  const [expandedYears, setExpandedYears] = useState<ExpandedState>({})
  const [expandedBimesters, setExpandedBimesters] = useState<ExpandedState>({})
  const [expandedUnits, setExpandedUnits] = useState<ExpandedState>({})

  const toggleExpand = (
    setter: React.Dispatch<React.SetStateAction<ExpandedState>>,
    id: string
  ) => {
    setter(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleToggleChapter = async (
    disciplineId: string,
    yearId: string,
    bimesterId: string,
    unitId: string,
    chapterId: string
  ) => {
    const updatedDisciplines = disciplines.map(discipline => {
      if (discipline.id !== disciplineId) return discipline
      
      return {
        ...discipline,
        years: discipline.years.map(year => {
          if (year.id !== yearId) return year
          
          return {
            ...year,
            bimesters: year.bimesters.map(bimester => {
              if (bimester.id !== bimesterId) return bimester
              
              return {
                ...bimester,
                units: bimester.units.map(unit => {
                  if (unit.id !== unitId) return unit
                  
                  return {
                    ...unit,
                    chapters: unit.chapters.map(chapter => {
                      if (chapter.id !== chapterId) return chapter
                      return { ...chapter, completed: !chapter.completed }
                    })
                  }
                })
              }
            })
          }
        })
      }
    })
    
    const updatedDiscipline = updatedDisciplines.find(d => d.id === disciplineId)
    if (updatedDiscipline) {
      await saveDiscipline(updatedDiscipline)
    }
    setDisciplines(updatedDisciplines)
  }

  const handleToggleUnit = async (
    disciplineId: string,
    yearId: string,
    bimesterId: string,
    unitId: string,
    selectAll: boolean
  ) => {
    const updatedDisciplines = disciplines.map(discipline => {
      if (discipline.id !== disciplineId) return discipline
      
      return {
        ...discipline,
        years: discipline.years.map(year => {
          if (year.id !== yearId) return year
          
          return {
            ...year,
            bimesters: year.bimesters.map(bimester => {
              if (bimester.id !== bimesterId) return bimester
              
              return {
                ...bimester,
                units: bimester.units.map(unit => {
                  if (unit.id !== unitId) return unit
                  
                  return {
                    ...unit,
                    chapters: unit.chapters.map(chapter => ({
                      ...chapter,
                      completed: selectAll
                    }))
                  }
                })
              }
            })
          }
        })
      }
    })
    
    const updatedDiscipline = updatedDisciplines.find(d => d.id === disciplineId)
    if (updatedDiscipline) {
      await saveDiscipline(updatedDiscipline)
    }
    setDisciplines(updatedDisciplines)
  }

  const getStats = (discipline: Discipline) => {
    let total = 0
    let completed = 0
    
    discipline.years.forEach(year => {
      year.bimesters.forEach(bimester => {
        bimester.units.forEach(unit => {
          unit.chapters.forEach(chapter => {
            total++
            if (chapter.completed) completed++
          })
        })
      })
    })
    
    return { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 }
  }

  const getYearStats = (year: Discipline['years'][0]) => {
    let total = 0
    let completed = 0
    
    year.bimesters.forEach(bimester => {
      bimester.units.forEach(unit => {
        unit.chapters.forEach(chapter => {
          total++
          if (chapter.completed) completed++
        })
      })
    })
    
    return { total, completed }
  }

  const getBimesterStats = (bimester: Discipline['years'][0]['bimesters'][0]) => {
    let total = 0
    let completed = 0
    
    bimester.units.forEach(unit => {
      unit.chapters.forEach(chapter => {
        total++
        if (chapter.completed) completed++
      })
    })
    
    return { total, completed }
  }

  const getUnitStats = (unit: Discipline['years'][0]['bimesters'][0]['units'][0]) => {
    let total = unit.chapters.length
    let completed = unit.chapters.filter(c => c.completed).length
    
    return { total, completed }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (disciplines.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-foreground">Nenhuma disciplina cadastrada</p>
          <p className="text-sm text-muted-foreground mt-1">
            Acesse a pagina de Cadastro JSON para adicionar disciplinas
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {disciplines.map((discipline) => {
          const stats = getStats(discipline)
          return (
            <Card key={discipline.id} className="border-border bg-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-foreground truncate">{discipline.name}</span>
                  <span className="text-sm font-bold text-primary">{stats.percentage}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div 
                    className="h-2 rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${stats.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {stats.completed} de {stats.total} capítulos
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="space-y-4">
        {disciplines.map((discipline) => {
          const stats = getStats(discipline)
          const isExpanded = expandedDisciplines[discipline.id]
          
          return (
            <Card key={discipline.id} className="border-border bg-card overflow-hidden">
              <CardHeader 
                className="cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => toggleExpand(setExpandedDisciplines, discipline.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                    <CardTitle className="text-lg font-semibold text-card-foreground">
                      {discipline.name}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {stats.completed}/{stats.total}
                    </span>
                    <div className="w-24 h-2 rounded-full bg-muted">
                      <div 
                        className="h-2 rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${stats.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent className="border-t border-border pt-4">
                  <div className="space-y-4">
                    {discipline.years.map((year) => {
                      const yearStats = getYearStats(year)
                      const isYearExpanded = expandedYears[year.id]
                      
                      return (
                        <div key={year.id} className="rounded-lg border border-border overflow-hidden">
                          <button
                            className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                            onClick={() => toggleExpand(setExpandedYears, year.id)}
                          >
                            <div className="flex items-center gap-2">
                              {isYearExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="font-medium text-foreground">{year.name}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {yearStats.completed}/{yearStats.total}
                            </span>
                          </button>
                          
                          {isYearExpanded && (
                            <div className="p-3 space-y-3">
                              {year.bimesters.map((bimester) => {
                                const bimesterStats = getBimesterStats(bimester)
                                const isBimesterExpanded = expandedBimesters[bimester.id]
                                
                                return (
                                  <div key={bimester.id} className="ml-4 rounded-lg border border-border overflow-hidden">
                                    <button
                                      className="w-full flex items-center justify-between p-2 bg-card hover:bg-muted/30 transition-colors"
                                      onClick={() => toggleExpand(setExpandedBimesters, bimester.id)}
                                    >
                                      <div className="flex items-center gap-2">
                                        {isBimesterExpanded ? (
                                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                        ) : (
                                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                        )}
                                        <span className="text-sm font-medium text-foreground">{bimester.name}</span>
                                      </div>
                                      <span className="text-xs text-muted-foreground">
                                        {bimesterStats.completed}/{bimesterStats.total}
                                      </span>
                                    </button>
                                    
                                    {isBimesterExpanded && (
                                      <div className="p-2 space-y-2">
                                        {bimester.units.map((unit) => {
                                          const unitStats = getUnitStats(unit)
                                          const isUnitExpanded = expandedUnits[unit.id]
                                          
                                          const allCompleted = unitStats.completed === unitStats.total && unitStats.total > 0
                                          const someCompleted = unitStats.completed > 0 && unitStats.completed < unitStats.total
                                          
                                          return (
                                            <div key={unit.id} className="ml-3 rounded border border-border overflow-hidden">
                                              <div className="flex items-center justify-between p-2 bg-muted/20 hover:bg-muted/40 transition-colors">
                                                <div className="flex items-center gap-2">
                                                  <Checkbox
                                                    checked={allCompleted}
                                                    className={someCompleted ? 'data-[state=unchecked]:bg-primary/30' : ''}
                                                    onCheckedChange={(checked) => {
                                                      handleToggleUnit(
                                                        discipline.id,
                                                        year.id,
                                                        bimester.id,
                                                        unit.id,
                                                        checked as boolean
                                                      )
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                  />
                                                  <button
                                                    className="flex items-center gap-2 flex-1 text-left"
                                                    onClick={() => toggleExpand(setExpandedUnits, unit.id)}
                                                  >
                                                    {isUnitExpanded ? (
                                                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                                    ) : (
                                                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                                    )}
                                                    <span className={`text-sm ${allCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                                      {getSequentialUnitName(bimester.name, unit.name)}
                                                    </span>
                                                  </button>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  {allCompleted ? (
                                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                                  ) : (
                                                    <Circle className="h-4 w-4 text-muted-foreground" />
                                                  )}
                                                  <span className="text-xs text-muted-foreground">
                                                    {unitStats.completed}/{unitStats.total}
                                                  </span>
                                                </div>
                                              </div>
                                              
                                              {isUnitExpanded && (
                                                <div className="p-2 space-y-1 bg-card">
                                                  {unit.chapters.map((chapter) => (
                                                    <label
                                                      key={chapter.id}
                                                      className="flex items-center gap-3 p-2 rounded hover:bg-muted/30 cursor-pointer transition-colors"
                                                    >
                                                      <Checkbox
                                                        checked={chapter.completed}
                                                        onCheckedChange={() => handleToggleChapter(
                                                          discipline.id,
                                                          year.id,
                                                          bimester.id,
                                                          unit.id,
                                                          chapter.id
                                                        )}
                                                      />
                                                      <span className={`text-sm ${chapter.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                                        {chapter.name}
                                                      </span>
                                                    </label>
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
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
