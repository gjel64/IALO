import { isActivity } from '../activities'
import type { Container, Item } from './types'

const isAct = (c: Container, el: any) => isActivity(c.action(el)?.library)

export const read = (c: Container, content: any): Item[] =>
  c.slots(content).flatMap((list, i) => list.filter(el => isAct(c, el)).map(el => ({
    id: c.action(el)!.subContentId ?? crypto.randomUUID(),
    action: structuredClone(c.action(el)!),
    pos: c.posOf(el, i),
    el,
  })))

// Slot content in display order: non-activity elements untouched, activities in place, moved/new ones appended.
type Entry = { el: any; item?: undefined } | { item: Item; el?: undefined }

export function entries(c: Container, content: any, items: Item[], i: number): Entry[] {
  const list = c.slots(content)[i]
  const here = items.filter(it => c.slot(it.pos) === i)
  return [
    ...list.flatMap((el): Entry[] => (isAct(c, el) ? here.filter(it => it.el === el).map(item => ({ item })) : [{ el }])),
    ...here.filter(it => !list.includes(it.el)).map(item => ({ item })),
  ]
}

export function write(c: Container, content: any, items: Item[]): any {
  const out = structuredClone(content)
  c.slots(out).forEach((list, i) =>
    list.splice(0, list.length, ...entries(c, content, items, i).map(e => (e.item ? c.wrap(e.item.action, e.item.pos, e.item.el) : e.el))))
  return out
}
