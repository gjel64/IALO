import type { FC } from 'react'
import type { ActivityType } from '../activities/types'

export interface Action { library: string; params: any; subContentId?: string; metadata?: any }

export interface Item {
  id: string
  action: Action
  pos: number // seconds (video) or slide/chapter index
  el?: any // original wrapper in content.json, undefined for new items
}

export interface Ctl {
  selected?: string
  select(id?: string): void
  add(type: ActivityType, pos: number, params?: any): void
  update(id: string, patch: Partial<Item>): void
  remove(id: string): void
  edit(fn: (content: any) => void): void // change the container itself (e.g. a chapter title)
  insertSlot(at: number): void
  removeSlot(at: number): void
}

export interface ViewProps { content: any; items: Item[]; files: Record<string, string>; ctl: Ctl }

// A container is an H5P resource (video, presentation, book) holding activities in "slots".
export interface Container {
  label: string
  hint: string // how to add activities, shown after creating a content
  slots(c: any): any[][]
  slotName(c: any, i: number): string
  action(el: any): Action | undefined
  posOf(el: any, slot: number): number
  slot(pos: number): number
  wrap(action: Action, pos: number, prev?: any): any
  // Optional: lets the teacher add / remove slides or chapters.
  slotList?(c: any): any[]
  newSlot?(c: any): any
  View: FC<ViewProps>
}
