import { useEffect, useRef, useState, type ReactNode } from 'react'
import { activities, activityOf } from './activities'
import type { Ctl, Item } from './containers/types'

// Page title: names the browser tab and takes focus so screen readers announce the new screen.
export function Heading({ title, className, children }: { title: string; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => { document.title = `${title} – IALO` }, [title])
  useEffect(() => { ref.current?.focus() }, [])
  return <h1 ref={ref} tabIndex={-1} className={className}>{children}</h1>
}

// File picker usable with the keyboard, the mouse (click anywhere) or drag and drop.
export function DropZone({ id, accept, multiple, label, onFiles }: { id?: string; accept: string; multiple?: boolean; label: string; onFiles: (files: File[]) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  return (
    <div
      className={over ? 'drop-zone over' : 'drop-zone'}
      onClick={e => { if (!(e.target as Element).closest('button, input')) input.current?.click() }}
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false) }}
      onDrop={e => { e.preventDefault(); setOver(false); onFiles([...e.dataTransfer.files]) }}
    >
      <button id={id} type="button" className="primary big" onClick={() => input.current?.click()}>{label}</button>
      <span aria-hidden="true">{over ? 'Déposez pour ajouter' : 'ou glissez-déposez ici'}</span>
      <input ref={input} type="file" hidden accept={accept} multiple={multiple} onChange={e => { onFiles([...(e.target.files ?? [])]); e.target.value = '' }} />
    </div>
  )
}

export const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`
export const parseTime = (v: string) => v.split(':').reduce((acc, n) => acc * 60 + Number(n), 0)

// An activity as the student sees it, editable in place, with a small toolbar.
export function ActivityCard({ item, ctl, tools }: { item: Item; ctl: Ctl; tools?: ReactNode }) {
  const t = activityOf(item.action.library)!
  return (
    <div className={item.id === ctl.selected ? 'activity selected' : 'activity'} onClick={() => ctl.select(item.id)} onFocus={() => item.id !== ctl.selected && ctl.select(item.id)}>
      <div className="bar">
        <span><span aria-hidden="true">{t.icon}</span> {t.label}</span>
        {tools}
        <button title="Dupliquer" aria-label={`Dupliquer l’activité ${t.label}`} onClick={() => ctl.add(t, item.pos, structuredClone(item.action.params))}>⧉</button>
        <button title="Supprimer" aria-label={`Supprimer l’activité ${t.label}`} onClick={() => ctl.remove(item.id)}>🗑</button>
      </div>
      <t.Edit p={item.action.params} set={params => ctl.update(item.id, { action: { ...item.action, params } })} />
    </div>
  )
}

export const AddMenu = ({ label = '+ Ajouter une activité', onAdd }: { label?: string; onAdd: (t: (typeof activities)[number]) => void }) => (
  <div className="add-menu" role="group" aria-label={label}>
    <span aria-hidden="true">{label}</span>
    {activities.map(t => <button key={t.machineName} onClick={() => onAdd(t)}><span aria-hidden="true">{t.icon}</span> {t.label}</button>)}
  </div>
)

// Number of activities in a slide / chapter, spelled out for screen readers.
export const Count = ({ n }: { n: number }) =>
  n ? <small><span className="sr-only">, </span>{n}<span className="sr-only"> activité{n > 1 ? 's' : ''}</span></small> : null

export const MoveTo = ({ item, ctl, names }: { item: Item; ctl: Ctl; names: string[] }) => (
  <select title="Déplacer" aria-label="Déplacer vers" value={item.pos} onChange={e => ctl.update(item.id, { pos: +e.target.value })}>
    {names.map((n, i) => <option key={i} value={i}>↪ {n}</option>)}
  </select>
)

// Non-activity content (text, images…) shown read-only.
const clean = (html = '') => html.replace(/<(script|iframe|style)[\s\S]*?<\/\1>/gi, '').replace(/\son\w+="[^"]*"/gi, '')
export function Static({ action, files }: { action: any; files: Record<string, string> }) {
  const lib = action?.library?.split(' ')[0]
  if (lib === 'H5P.AdvancedText' || lib === 'H5P.Text') return <div className="static" dangerouslySetInnerHTML={{ __html: clean(action.params.text) }} />
  if (lib === 'H5P.Image') return <img className="static" src={files[action.params.file?.path] ?? action.params.file?.path} alt={action.params.alt ?? ''} />
  return <div className="static muted">{lib ?? 'Élément'}</div>
}
