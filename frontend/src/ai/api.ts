import { toText } from '../activities/ui'
import type { Action, Container } from '../containers/types'

// Calls to the API (backend/main.py), which talks to the LLM: the API key never reaches the browser.

export interface Section { name: string; text: string }
export interface Generated { section: number; type: string; data: any }

async function post<T>(path: string, body: unknown): Promise<T> {
  let r: Response
  try {
    r = await fetch(`/api/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  } catch {
    throw new Error('Le serveur est injoignable. Vérifiez votre connexion.')
  }
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(typeof data.detail === 'string' ? data.detail : `Erreur du serveur (${r.status}).`)
  return data
}

export const generateCourse = (body: { title: string; sections: Section[]; types: string[]; count: number; instructions: string }) =>
  post<{ activities: Generated[] }>('generate/course', body).then(r => r.activities)

export const generateActivity = (body: { type: string; title: string; section: Section; instructions?: string }) =>
  post<{ data: any }>('generate/activity', body).then(r => r.data)

// The text of each slide / chapter: text blocks, and image descriptions (a PDF page's text is its description).
const textOf = (a?: Action): string => {
  const lib = a?.library?.split(' ')[0]
  if (lib === 'H5P.AdvancedText' || lib === 'H5P.Text') return toText(a!.params.text).trim()
  if (lib === 'H5P.Image') return (a!.params.alt ?? '').trim()
  return ''
}

export const sections = (c: Container, content: any): Section[] =>
  c.slots(content).map((list, i) => ({ name: c.slotName(content, i), text: list.map(el => textOf(c.action(el))).filter(Boolean).join('\n') }))
