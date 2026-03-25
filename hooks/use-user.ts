'use client'

import { useState, useEffect } from 'react'

export function useUser() {
  const [userName, setUserName] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    const stored = window.localStorage.getItem('kanban_user_name')
    if (stored) {
      setUserName(stored)
    }
    setIsInitializing(false)
  }, [])

  const saveUserName = (name: string) => {
    window.localStorage.setItem('kanban_user_name', name)
    setUserName(name)
  }

  const removeUserName = () => {
    window.localStorage.removeItem('kanban_user_name')
    setUserName(null)
  }

  return {
    userName,
    isInitializing,
    saveUserName,
    removeUserName
  }
}
