'use client'

import { useState, useEffect, useCallback } from 'react'
import { Discipline, KanbanItem, CalendarItem, WorkbookItem, CalendarEvent, ProductionStats, KanbanStatus } from '@/lib/types'
import {
  getDisciplinesFromDB,
  saveDisciplinesToDB,
  saveDisciplineToDB,
  deleteAllDisciplinesFromDB,
  getKanbanItemsFromDB,
  addKanbanItemToDB,
  updateKanbanItemStatusInDB,
  updateKanbanItemPrintApprovalInDB,
  removeKanbanItemFromDB,
  getCalendarItemsFromDB,
  addCalendarItemToDB,
  updateCalendarItemDateInDB,
  removeCalendarItemFromDB,
  getWorkbookItemsFromDB,
  addWorkbookItemToDB,
  updateWorkbookItemStatusInDB,
  removeWorkbookItemFromDB,
  getCalendarEventsFromDB,
  addCalendarEventToDB,
  updateCalendarEventInDB,
  removeCalendarEventFromDB,
  getProductionStatsFromDB,
  markUnitAsCompletedInDB
} from '@/lib/supabase-store'

export function useDisciplines() {
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDisciplines = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getDisciplinesFromDB()
      setDisciplines(data)
      setError(null)
    } catch (err) {
      setError('Erro ao carregar disciplinas')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDisciplines()
  }, [fetchDisciplines])

  const saveDisciplines = useCallback(async (newDisciplines: Discipline[]) => {
    try {
      await saveDisciplinesToDB(newDisciplines)
      setDisciplines(newDisciplines)
    } catch (err) {
      setError('Erro ao salvar disciplinas')
      console.error(err)
    }
  }, [])

  const saveDiscipline = useCallback(async (discipline: Discipline) => {
    try {
      await saveDisciplineToDB(discipline)
      setDisciplines(prev => {
        const index = prev.findIndex(d => d.id === discipline.id)
        if (index >= 0) {
          const updated = [...prev]
          updated[index] = discipline
          return updated
        }
        return [...prev, discipline]
      })
    } catch (err) {
      setError('Erro ao salvar disciplina')
      console.error(err)
    }
  }, [])

  const clearAllDisciplines = useCallback(async () => {
    try {
      await deleteAllDisciplinesFromDB()
      setDisciplines([])
    } catch (err) {
      setError('Erro ao limpar disciplinas')
      console.error(err)
    }
  }, [])

  return {
    disciplines,
    loading,
    error,
    fetchDisciplines,
    saveDisciplines,
    saveDiscipline,
    clearAllDisciplines,
    setDisciplines
  }
}

export function useKanbanItems() {
  const [kanbanItems, setKanbanItems] = useState<KanbanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchKanbanItems = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getKanbanItemsFromDB()
      setKanbanItems(data)
      setError(null)
    } catch (err) {
      setError('Erro ao carregar itens do kanban')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchKanbanItems()
    const interval = setInterval(fetchKanbanItems, 300000)
    const onVisible = () => { if (document.visibilityState === 'visible') fetchKanbanItems() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [fetchKanbanItems])

  const addItem = useCallback(async (item: Omit<KanbanItem, 'id' | 'createdAt'>) => {
    try {
      const newItem = await addKanbanItemToDB(item)
      if (newItem) {
        setKanbanItems(prev => [...prev, newItem])
        return newItem
      }
    } catch (err) {
      setError('Erro ao adicionar item')
      console.error(err)
    }
    return null
  }, [])

  const updateStatus = useCallback(async (id: string, status: KanbanStatus, markCompleted = true) => {
    try {
      const item = kanbanItems.find(i => i.id === id)
      await updateKanbanItemStatusInDB(id, status)

      // Se moveu para completed, marca a unidade como concluida
      if (status === 'completed' && markCompleted) {
        if (item) {
          await markUnitAsCompletedInDB(item.disciplineId, item.yearId, item.bimesterId, item.unitId, true)
        }
      }

      if (item && status !== 'printing') {
        const userName = typeof window !== 'undefined' ? localStorage.getItem('kanban_user_name') : null;
        fetch('/api/slack/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            unitName: item.unitName,
            disciplineName: item.disciplineName,
            yearName: item.yearName,
            bimesterName: item.bimesterName,
            previousStatus: item.status,
            newStatus: status,
            boardType: 'content',
            userName: userName || 'Autor não identificado'
          }),
        }).catch(err => console.error('Slack notify failed:', err))
      }

      setKanbanItems(prev => prev.map(i =>
        i.id === id ? { ...i, status } : i
      ))
    } catch (err) {
      setError('Erro ao atualizar status')
      console.error(err)
    }
  }, [kanbanItems])

  const removeItem = useCallback(async (id: string) => {
    try {
      await removeKanbanItemFromDB(id)
      setKanbanItems(prev => prev.filter(item => item.id !== id))
    } catch (err) {
      setError('Erro ao remover item')
      console.error(err)
    }
  }, [])

  const updatePrintApproval = useCallback(async (id: string, approved: boolean) => {
    try {
      await updateKanbanItemPrintApprovalInDB(id, approved)
      setKanbanItems(prev => prev.map(i =>
        i.id === id ? { ...i, printApproved: approved } : i
      ))

      if (approved) {
        const item = kanbanItems.find(i => i.id === id)
        if (item) {
          const userName = typeof window !== 'undefined' ? localStorage.getItem('kanban_user_name') : null
          fetch('/api/slack/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              unitName: item.unitName,
              disciplineName: item.disciplineName,
              yearName: item.yearName,
              bimesterName: item.bimesterName,
              previousStatus: item.status,
              newStatus: 'printing',
              boardType: 'content',
              userName: userName || 'Autor não identificado',
              isApproval: true
            }),
          }).catch(err => console.error('Slack notify failed:', err))
        }
      }
    } catch (err) {
      setError('Erro ao atualizar aprovação')
      console.error(err)
    }
  }, [kanbanItems])

  return {
    kanbanItems,
    loading,
    error,
    fetchKanbanItems,
    addItem,
    updateStatus,
    removeItem,
    updatePrintApproval,
    setKanbanItems
  }
}

export function useCalendarItems() {
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCalendarItems = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getCalendarItemsFromDB()
      setCalendarItems(data)
      setError(null)
    } catch (err) {
      setError('Erro ao carregar itens do calendario')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCalendarItems()
    const interval = setInterval(fetchCalendarItems, 300000)
    const onVisible = () => { if (document.visibilityState === 'visible') fetchCalendarItems() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [fetchCalendarItems])

  const addItem = useCallback(async (item: Omit<CalendarItem, 'id'>) => {
    try {
      const newItem = await addCalendarItemToDB(item)
      if (newItem) {
        setCalendarItems(prev => [...prev, newItem])
        return newItem
      }
    } catch (err) {
      setError('Erro ao adicionar item')
      console.error(err)
    }
    return null
  }, [])

  const updateDate = useCallback(async (id: string, date: string) => {
    try {
      await updateCalendarItemDateInDB(id, date)
      setCalendarItems(prev => prev.map(item => 
        item.id === id ? { ...item, date } : item
      ))
    } catch (err) {
      setError('Erro ao atualizar data')
      console.error(err)
    }
  }, [])

  const removeItem = useCallback(async (id: string) => {
    try {
      await removeCalendarItemFromDB(id)
      setCalendarItems(prev => prev.filter(item => item.id !== id))
    } catch (err) {
      setError('Erro ao remover item')
      console.error(err)
    }
  }, [])

  return {
    calendarItems,
    loading,
    error,
    fetchCalendarItems,
    addItem,
    updateDate,
    removeItem,
    setCalendarItems
  }
}

export function useWorkbookItems() {
  const [workbookItems, setWorkbookItems] = useState<WorkbookItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWorkbookItems = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getWorkbookItemsFromDB()
      setWorkbookItems(data)
      setError(null)
    } catch (err) {
      setError('Erro ao carregar itens do caderno de atividades')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWorkbookItems()
    const interval = setInterval(fetchWorkbookItems, 300000)
    const onVisible = () => { if (document.visibilityState === 'visible') fetchWorkbookItems() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [fetchWorkbookItems])

  const addItem = useCallback(async (item: Omit<WorkbookItem, 'id' | 'createdAt'>) => {
    try {
      const newItem = await addWorkbookItemToDB(item)
      if (newItem) {
        setWorkbookItems(prev => [...prev, newItem])
        return newItem
      }
    } catch (err) {
      setError('Erro ao adicionar item')
      console.error(err)
    }
    return null
  }, [])

  const updateStatus = useCallback(async (id: string, status: KanbanStatus, markCompleted = true) => {
    try {
      const item = workbookItems.find(i => i.id === id)
      await updateWorkbookItemStatusInDB(id, status)

      // Se moveu para completed, marca a unidade como concluida
      if (status === 'completed' && markCompleted) {
        if (item) {
          await markUnitAsCompletedInDB(item.disciplineId, item.yearId, item.bimesterId, item.unitId, true)
        }
      }

      if (item) {
        const userName = typeof window !== 'undefined' ? localStorage.getItem('kanban_user_name') : null;
        fetch('/api/slack/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            unitName: item.unitName,
            disciplineName: item.disciplineName,
            yearName: item.yearName,
            bimesterName: item.bimesterName,
            previousStatus: item.status,
            newStatus: status,
            boardType: 'workbook',
            userName: userName || 'Autor não identificado'
          }),
        }).catch(err => console.error('Slack notify failed:', err))
      }

      setWorkbookItems(prev => prev.map(i =>
        i.id === id ? { ...i, status } : i
      ))
    } catch (err) {
      setError('Erro ao atualizar status')
      console.error(err)
    }
  }, [workbookItems])

  const removeItem = useCallback(async (id: string) => {
    try {
      await removeWorkbookItemFromDB(id)
      setWorkbookItems(prev => prev.filter(item => item.id !== id))
    } catch (err) {
      setError('Erro ao remover item')
      console.error(err)
    }
  }, [])

  return {
    workbookItems,
    loading,
    error,
    fetchWorkbookItems,
    addItem,
    updateStatus,
    removeItem,
    setWorkbookItems
  }
}

export function useCalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getCalendarEventsFromDB()
      setEvents(data)
      setError(null)
    } catch (err) {
      setError('Erro ao carregar eventos')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const addEvent = useCallback(async (event: Omit<CalendarEvent, 'id' | 'createdAt'>) => {
    try {
      const newEvent = await addCalendarEventToDB(event)
      if (newEvent) {
        setEvents(prev => [...prev, newEvent])
        return newEvent
      }
    } catch (err) {
      setError('Erro ao adicionar evento')
      console.error(err)
    }
    return null
  }, [])

  const updateEvent = useCallback(async (id: string, event: Partial<Omit<CalendarEvent, 'id' | 'createdAt'>>) => {
    try {
      await updateCalendarEventInDB(id, event)
      setEvents(prev => prev.map(e => 
        e.id === id ? { ...e, ...event } : e
      ))
    } catch (err) {
      setError('Erro ao atualizar evento')
      console.error(err)
    }
  }, [])

  const removeEvent = useCallback(async (id: string) => {
    try {
      await removeCalendarEventFromDB(id)
      setEvents(prev => prev.filter(e => e.id !== id))
    } catch (err) {
      setError('Erro ao remover evento')
      console.error(err)
    }
  }, [])

  return {
    events,
    loading,
    error,
    fetchEvents,
    addEvent,
    updateEvent,
    removeEvent,
    setEvents
  }
}

export function useProductionStats() {
  const [stats, setStats] = useState<ProductionStats>({
    totalChapters: 0,
    completedChapters: 0,
    inProduction: 0,
    inLayout: 0,
    inPrinting: 0,
    inCompleted: 0
  })
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getProductionStatsFromDB()
      setStats(data)
    } catch (err) {
      console.error('Erro ao carregar estatisticas:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 300000)
    const onVisible = () => { if (document.visibilityState === 'visible') fetchStats() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [fetchStats])

  return { stats, loading, fetchStats }
}
