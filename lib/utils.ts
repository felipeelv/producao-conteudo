import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calcula o número sequencial da unidade baseado no bimestre.
 * Ex: 1º Bim = Unidade 1, 2; 2º Bim = Unidade 3, 4; 3º Bim = Unidade 5, 6; 4º Bim = Unidade 7, 8
 * 
 * Lida com dois padrões de dados:
 * - Unidades numeradas dentro do bimestre (1, 2) -> recalcula para sequencial
 * - Unidades já com numeração sequencial (5, 6, 7, 8) -> mantém o número original
 * 
 * @param bimesterName - Nome do bimestre (ex: "1º Bimestre", "2º Bimestre")
 * @param unitName - Nome da unidade original (ex: "Unidade 1", "Unidade 2", "Unidade 7")
 * @returns Nome da unidade com numeração sequencial (ex: "Unidade 3")
 */
export function getSequentialUnitName(bimesterName: string, unitName: string): string {
  // Extrai o número do bimestre (1, 2, 3 ou 4)
  const bimesterMatch = bimesterName.match(/(\d+)/)
  const bimesterNumber = bimesterMatch ? parseInt(bimesterMatch[1], 10) : 1
  
  // Extrai o número da unidade
  const unitMatch = unitName.match(/(\d+)/)
  const unitNumber = unitMatch ? parseInt(unitMatch[1], 10) : 1
  
  // Se o número da unidade já é maior que 2, provavelmente já está sequencial
  // (ex: "Unidade 5" do 3º Bimestre já está correto)
  if (unitNumber > 2) {
    return `Unidade ${unitNumber}`
  }
  
  // Caso contrário, calcula o número sequencial: (bimestre - 1) * 2 + número da unidade
  // 1º Bim, Unidade 1 = (1-1)*2 + 1 = 1
  // 1º Bim, Unidade 2 = (1-1)*2 + 2 = 2
  // 2º Bim, Unidade 1 = (2-1)*2 + 1 = 3
  // 2º Bim, Unidade 2 = (2-1)*2 + 2 = 4
  const sequentialNumber = (bimesterNumber - 1) * 2 + unitNumber
  
  return `Unidade ${sequentialNumber}`
}

/**
 * Retorna o indicador visual para o status do Kanban
 */
export type KanbanStatusType = 'production' | 'layout' | 'printing' | 'completed'

export interface StatusIndicator {
  label: string
  shortLabel: string
  color: string
  bgColor: string
}

export const KANBAN_STATUS_INDICATORS: Record<KanbanStatusType, StatusIndicator> = {
  production: {
    label: 'Em Produção',
    shortLabel: 'Prod',
    color: '#eab308',
    bgColor: '#eab30820'
  },
  layout: {
    label: 'Diagramação',
    shortLabel: 'Diag',
    color: '#3b82f6',
    bgColor: '#3b82f620'
  },
  printing: {
    label: 'Impressão',
    shortLabel: 'Impr',
    color: '#8b5cf6',
    bgColor: '#8b5cf620'
  },
  completed: {
    label: 'Concluído',
    shortLabel: 'OK',
    color: '#10b981',
    bgColor: '#10b98120'
  }
}

export function getStatusIndicator(status: KanbanStatusType): StatusIndicator {
  return KANBAN_STATUS_INDICATORS[status] || KANBAN_STATUS_INDICATORS.production
}
