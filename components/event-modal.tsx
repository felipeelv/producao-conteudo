'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalendarEvent, CalendarEventType, EVENT_TYPE_COLORS, EVENT_TYPE_LABELS } from '@/lib/types'
import { X, Calendar, Clock, FileText, Palette } from 'lucide-react'

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (event: Omit<CalendarEvent, 'id' | 'createdAt'>) => void
  onUpdate?: (id: string, event: Partial<Omit<CalendarEvent, 'id' | 'createdAt'>>) => void
  onDelete?: (id: string) => void
  event?: CalendarEvent | null
  initialDate?: string
}

const EVENT_TYPES: CalendarEventType[] = ['bimester', 'exam', 'delivery', 'meeting', 'holiday', 'recess', 'other']

export function EventModal({ isOpen, onClose, onSave, onUpdate, onDelete, event, initialDate }: EventModalProps) {
  const [title, setTitle] = useState('')
  const [eventType, setEventType] = useState<CalendarEventType>('other')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [color, setColor] = useState(EVENT_TYPE_COLORS.other)
  const [description, setDescription] = useState('')
  const [isPeriod, setIsPeriod] = useState(false)

  useEffect(() => {
    if (event) {
      setTitle(event.title)
      setEventType(event.eventType)
      setStartDate(event.startDate)
      setEndDate(event.endDate || '')
      setColor(event.color)
      setDescription(event.description || '')
      setIsPeriod(!!event.endDate)
    } else {
      setTitle('')
      setEventType('other')
      setStartDate(initialDate || new Date().toISOString().split('T')[0])
      setEndDate('')
      setColor(EVENT_TYPE_COLORS.other)
      setDescription('')
      setIsPeriod(false)
    }
  }, [event, initialDate, isOpen])

  useEffect(() => {
    setColor(EVENT_TYPE_COLORS[eventType])
    // Bimestre e recesso sao sempre periodos
    if (eventType === 'bimester' || eventType === 'recess') {
      setIsPeriod(true)
    }
  }, [eventType])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const eventData = {
      title,
      eventType,
      startDate,
      endDate: isPeriod && endDate ? endDate : null,
      color,
      description: description || null
    }

    if (event && onUpdate) {
      onUpdate(event.id, eventData)
    } else {
      onSave(eventData)
    }
    onClose()
  }

  const handleDelete = () => {
    if (event && onDelete && confirm('Tem certeza que deseja excluir este evento?')) {
      onDelete(event.id)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-card-foreground">
            {event ? 'Editar Evento' : 'Novo Evento'}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Titulo */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Titulo
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: 1o Bimestre, Prova de Matematica..."
              required
              className="bg-background"
            />
          </div>

          {/* Tipo de evento */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Tipo de Evento</label>
            <div className="grid grid-cols-2 gap-2">
              {EVENT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setEventType(type)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm border transition-colors ${
                    eventType === type 
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-border bg-background text-foreground hover:bg-muted'
                  }`}
                >
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: EVENT_TYPE_COLORS[type] }} 
                  />
                  {EVENT_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          {/* Periodo ou data unica */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Duracao
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsPeriod(false)}
                disabled={eventType === 'bimester' || eventType === 'recess'}
                className={`flex-1 px-3 py-2 rounded-md text-sm border transition-colors ${
                  !isPeriod 
                    ? 'border-primary bg-primary/10 text-primary' 
                    : 'border-border bg-background text-foreground hover:bg-muted'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Data unica
              </button>
              <button
                type="button"
                onClick={() => setIsPeriod(true)}
                className={`flex-1 px-3 py-2 rounded-md text-sm border transition-colors ${
                  isPeriod 
                    ? 'border-primary bg-primary/10 text-primary' 
                    : 'border-border bg-background text-foreground hover:bg-muted'
                }`}
              >
                Periodo
              </button>
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {isPeriod ? 'Data Inicio' : 'Data'}
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="bg-background"
              />
            </div>
            {isPeriod && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Data Fim
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  required={isPeriod}
                  className="bg-background"
                />
              </div>
            )}
          </div>

          {/* Cor personalizada */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Cor
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded border border-border cursor-pointer"
              />
              <span className="text-sm text-muted-foreground">{color}</span>
              <button
                type="button"
                onClick={() => setColor(EVENT_TYPE_COLORS[eventType])}
                className="text-xs text-primary hover:underline ml-auto"
              >
                Restaurar padrao
              </button>
            </div>
          </div>

          {/* Descricao */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Descricao (opcional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione uma descricao..."
              rows={2}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          {/* Botoes */}
          <div className="flex gap-2 pt-2">
            {event && onDelete && (
              <Button type="button" variant="destructive" onClick={handleDelete} className="mr-auto">
                Excluir
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose} className={event ? '' : 'flex-1'}>
              Cancelar
            </Button>
            <Button type="submit" className={event ? '' : 'flex-1'}>
              {event ? 'Salvar' : 'Criar Evento'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
