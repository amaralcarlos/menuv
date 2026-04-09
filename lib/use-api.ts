'use client'
import { useCallback } from 'react'

export function useApi() {
  const call = useCallback(async <T = unknown>(
    path: string,
    opts: RequestInit = {}
  ): Promise<{ success: true; data: T } | { success: false; error: string }> => {
    try {
      const res = await fetch(path, {
        ...opts,
        headers: { 'Content-Type': 'application/json', ...(opts.headers ?? {}) },
        credentials: 'include',
      })
      const json = await res.json()
      if (json.success) return { success: true, data: json.data }
      return { success: false, error: json.error ?? 'Erro desconhecido.' }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  }, [])

  return { call }
}
