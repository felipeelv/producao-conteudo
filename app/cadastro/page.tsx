'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useDisciplines } from '@/hooks/use-production-data'
import { validateImportedJSON, convertImportedDiscipline } from '@/lib/supabase-store'
import { Discipline, ImportedDiscipline } from '@/lib/types'
import { getSequentialUnitName } from '@/lib/utils'
import { Upload, Download, Trash2, Check, AlertCircle, FileJson, Copy, Loader2 } from 'lucide-react'

const EXAMPLE_JSON = `{
  "disciplina": "Química",
  "descricao": "Ensino Médio",
  "ano_letivo": 2026,
  "anos": [
    {
      "ano": "9º Ano",
      "bimestres": [
        {
          "bimestre": "1º Bimestre",
          "unidades": [
            {
              "unidade": "Unidade 1 - Estrutura da Matéria",
              "capitulos": [
                "Capítulo 1: Estados Físicos da Matéria",
                "Capítulo 2: Modelos Atômicos e Estrutura do Átomo"
              ]
            },
            {
              "unidade": "Unidade 2 - Tabela Periódica e Ligações Químicas",
              "capitulos": [
                "Capítulo 1: Tabela Periódica",
                "Capítulo 2: Ligações Químicas"
              ]
            }
          ]
        },
        {
          "bimestre": "2º Bimestre",
          "unidades": [
            {
              "unidade": "Unidade 1 - Introdução às Reações Químicas",
              "capitulos": [
                "Capítulo 1: Conceitos Fundamentais",
                "Capítulo 2: Tipos de Reações Químicas"
              ]
            }
          ]
        }
      ]
    }
  ]
}`

export default function CadastroPage() {
  const [jsonInput, setJsonInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  
  const { disciplines, loading, saveDisciplines, clearAllDisciplines } = useDisciplines()

  const handleImport = async () => {
    setError(null)
    setSuccess(null)
    setImporting(true)

    try {
      const parsed = JSON.parse(jsonInput)
      
      // Valida o JSON usando a nova função
      const validation = validateImportedJSON(parsed)
      
      if (!validation.valid) {
        throw new Error(validation.error || 'JSON inválido')
      }
      
      const importedData = validation.data!
      const dataArray = Array.isArray(importedData) ? importedData : [importedData]
      
      // Converte para o formato interno
      const convertedDisciplines: Discipline[] = []
      
      for (const item of dataArray) {
        // Verifica se e formato novo (com "disciplina") ou antigo (com "name")
        if ('disciplina' in item) {
          convertedDisciplines.push(convertImportedDiscipline(item as ImportedDiscipline))
        } else {
          // Formato antigo - já está no formato correto
          convertedDisciplines.push(item as Discipline)
        }
      }
      
      // Adiciona as novas disciplinas as existentes
      const allDisciplines = [...disciplines, ...convertedDisciplines]
      
      await saveDisciplines(allDisciplines)
      setSuccess(`${convertedDisciplines.length} disciplina(s) importada(s) com sucesso!`)
      setJsonInput('')
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError('JSON invalido. Verifique a sintaxe.')
      } else if (err instanceof Error) {
        setError(err.message)
      }
    } finally {
      setImporting(false)
    }
  }

  const handleExport = () => {
    const json = JSON.stringify(disciplines, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'disciplinas.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClear = async () => {
    if (confirm('Tem certeza que deseja limpar todas as disciplinas?')) {
      await clearAllDisciplines()
      setSuccess('Todas as disciplinas foram removidas.')
    }
  }

  const handleCopyExample = () => {
    navigator.clipboard.writeText(EXAMPLE_JSON)
    setSuccess('Exemplo copiado para a area de transferencia!')
    setTimeout(() => setSuccess(null), 3000)
  }

  const handleLoadExample = () => {
    setJsonInput(EXAMPLE_JSON)
    setError(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-card-foreground">
              <Upload className="h-5 w-5 text-primary" />
              Importar JSON
            </CardTitle>
            <CardDescription>
              Cole o JSON com as disciplinas, anos, bimestres, unidades e capítulos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="Cole o JSON aqui..."
              className="w-full h-64 rounded-lg border border-input bg-input p-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            
            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            {success && (
              <div className="flex items-start gap-2 rounded-lg bg-primary/10 p-3 text-sm text-primary">
                <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}
            
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleImport} disabled={!jsonInput.trim() || importing}>
                {importing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {importing ? 'Importando...' : 'Importar'}
              </Button>
              <Button variant="outline" onClick={handleLoadExample}>
                <FileJson className="h-4 w-4 mr-2" />
                Carregar Exemplo
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-card-foreground">
              <FileJson className="h-5 w-5 text-primary" />
              Estrutura do JSON
            </CardTitle>
            <CardDescription>
              Exemplo da estrutura esperada para importacao
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="rounded-lg border border-border bg-muted/30 p-4 text-xs font-mono text-foreground overflow-x-auto max-h-80">
                {EXAMPLE_JSON}
              </pre>
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2"
                onClick={handleCopyExample}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copiar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-card-foreground">
                  <Download className="h-5 w-5 text-primary" />
                  Disciplinas Cadastradas
                </CardTitle>
                <CardDescription>
                  {disciplines.length} disciplina(s) cadastrada(s)
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExport} disabled={disciplines.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
                <Button variant="outline" size="sm" onClick={handleClear} disabled={disciplines.length === 0}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {disciplines.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileJson className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma disciplina cadastrada
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Importe um JSON para comecar
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
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
                    <div key={discipline.id} className="rounded-lg border border-border bg-muted/30 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-foreground">{discipline.name}</h3>
                        <span className="text-xs text-muted-foreground">
                          {completedChapters}/{totalChapters} capítulos
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        {discipline.years.map((year) => (
                          <div key={year.id} className="ml-2">
                            <p className="text-sm font-medium text-foreground">{year.name}</p>
                            <div className="ml-2 space-y-1">
                              {year.bimesters.map((bimester) => (
                                <div key={bimester.id}>
                                  <p className="text-xs text-muted-foreground">{bimester.name}</p>
                                  <div className="ml-2 flex flex-wrap gap-1 mt-1">
                                    {bimester.units.map((unit) => (
                                      <span
                                        key={unit.id}
                                        className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                                      >
                                        {getSequentialUnitName(bimester.name, unit.name)} ({unit.chapters.length})
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
