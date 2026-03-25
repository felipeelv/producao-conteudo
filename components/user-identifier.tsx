'use client'

import { useState } from 'react'
import { useUser } from '@/hooks/use-user'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserCircle, LogOut } from 'lucide-react'

export function UserIdentifier() {
  const { userName, isInitializing, saveUserName, removeUserName } = useUser()
  const [inputName, setInputName] = useState('')

  if (isInitializing) return null

  if (!userName) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <Card className="w-full max-w-sm border-border bg-card shadow-lg mx-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-primary" />
              Identificação
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Por favor, informe seu nome para acessar o Kanban. Isso nos ajuda a saber quem concluiu as tarefas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form 
              onSubmit={(e) => {
                e.preventDefault()
                if (inputName.trim()) {
                  saveUserName(inputName.trim())
                }
              }}
              className="flex flex-col gap-4"
            >
              <Input 
                autoFocus
                placeholder="Seu nome" 
                value={inputName} 
                onChange={e => setInputName(e.target.value)} 
              />
              <Button type="submit" disabled={!inputName.trim()} className="w-full">
                Salvar e Continuar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-full text-sm">
      <UserCircle className="h-4 w-4 text-accent" />
      <span className="text-muted-foreground mr-1">Logado como:</span>
      <span className="font-medium text-foreground">{userName}</span>
      <button 
        onClick={removeUserName}
        className="ml-2 p-1 text-muted-foreground hover:text-destructive transition-colors rounded-full hover:bg-destructive/10"
        title="Sair / Trocar usuário"
      >
        <LogOut className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
