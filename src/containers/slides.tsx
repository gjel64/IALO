import { useState } from 'react'
import { ActivityCard, AddMenu, Count, MoveTo, Pager, Static } from '../components'
import { entries } from './model'
import type { Container } from './types'
import { Icon } from '../icons'

export const slides: Container = {
  label: 'Présentation',
  hint: 'Choisissez une diapo, puis une activité en bas de page. « + Nouvelle diapo » insère une diapo vide pour y poser une question à part.',
  slots: c => c.presentation.slides.map((s: any) => (s.elements ??= [])),
  slotName: (_, i) => `Diapo ${i + 1}`,
  action: el => el.action,
  posOf: (_, i) => i,
  slot: p => p,
  wrap: (action, _, prev) => ({ x: 5, y: 5, width: 90, height: 90, ...prev, action }),
  slotList: c => c.presentation.slides,
  newSlot: () => ({ elements: [], keywords: [], slideBackgroundSelector: {} }),

  View: ({ content, items, files, ctl, preview }) => {
    const [i, setI] = useState(0)
    const names = slides.slots(content).map((_, k) => slides.slotName(content, k))
    const list = entries(slides, content, items, i)
    return (
      <div className="slides">
        {!preview && <nav className="thumbs" aria-label="Diapos">
          {names.map((n, k) => (
            <button key={k} className={k === i ? 'on' : ''} aria-current={k === i || undefined} onClick={() => setI(k)}>
              {n}<Count n={items.filter(it => it.pos === k).length} />
            </button>
          ))}
          <button className="ghost" onClick={() => { ctl.insertSlot(i + 1); setI(i + 1) }}><Icon name="plus" /> Nouvelle diapo</button>
        </nav>}
        <div className="slide">
          {list.map((e, k) => {
            const g = e.item ? slides.wrap(e.item.action, i, e.item.el) : e.el
            return (
              <div key={e.item?.id ?? k} className={e.item?.id === ctl.selected ? 'el top' : 'el'} style={{ left: `${g.x}%`, top: `${g.y}%`, width: `${g.width}%`, height: `${g.height}%` }}>
                {e.item ? <ActivityCard item={e.item} ctl={ctl} preview={preview} tools={<MoveTo item={e.item} ctl={ctl} names={names} />} /> : <Static action={e.el.action} files={files} />}
              </div>
            )
          })}
          {!list.length && <p className="empty-slot">{preview ? 'Diapo vide' : 'Diapo vide : ajoutez une activité ci-dessous.'}</p>}
        </div>
        {preview && <Pager i={i} n={names.length} set={setI} label="Diapos" />}
        {!preview && <AddMenu label={`Ajouter sur la ${names[i].toLowerCase()}`} onAdd={t => ctl.add(t, i)} />}
        {!preview && !list.length && names.length > 1 && (
          <button className="link danger" onClick={() => { ctl.removeSlot(i); setI(Math.max(0, i - 1)) }}>Supprimer cette diapo vide</button>
        )}
      </div>
    )
  },
}
