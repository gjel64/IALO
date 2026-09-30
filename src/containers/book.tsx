import { useState } from 'react'
import { Editable } from '../activities/ui'
import { ActivityCard, AddMenu, Count, MoveTo, Static } from '../components'
import { entries } from './model'
import type { Container } from './types'

export const book: Container = {
  label: 'Livre interactif',
  hint: 'Choisissez un chapitre, puis une activité en bas de page. « + Nouveau chapitre » en crée un vide, dont vous pouvez modifier le titre.',
  slots: c => c.chapters.map((ch: any) => ((ch.params ??= {}).content ??= [])),
  slotName: (c, i) => c.chapters[i].metadata?.title || `Chapitre ${i + 1}`,
  action: el => el.content,
  posOf: (_, i) => i,
  slot: p => p,
  wrap: (action, _, prev) => ({ useSeparator: 'auto', ...prev, content: action }),
  slotList: c => c.chapters,
  newSlot: c => ({
    library: c.chapters[0]?.library ?? 'H5P.Column 1.22',
    params: { content: [] },
    subContentId: crypto.randomUUID(),
    metadata: { contentType: 'Column', license: 'U', title: 'Nouveau chapitre' },
  }),

  View: ({ content, items, files, ctl }) => {
    const [i, setI] = useState(0)
    const names = book.slots(content).map((_, k) => book.slotName(content, k))
    const list = entries(book, content, items, i)
    return (
      <div className="book">
        <nav aria-label="Chapitres">
          {names.map((n, k) => (
            <button key={k} className={k === i ? 'on' : ''} aria-current={k === i || undefined} onClick={() => setI(k)}>
              {n}<Count n={items.filter(it => it.pos === k).length} />
            </button>
          ))}
          <button className="ghost" onClick={() => { ctl.insertSlot(i + 1); setI(i + 1) }}>+ Nouveau chapitre</button>
        </nav>
        <article>
          <h2>
            <Editable value={names[i]} placeholder="Titre du chapitre" onChange={v => ctl.edit(c => { (c.chapters[i].metadata ??= {}).title = v })} />
          </h2>
          {list.map((e, k) =>
            e.item
              ? <ActivityCard key={e.item.id} item={e.item} ctl={ctl} tools={<MoveTo item={e.item} ctl={ctl} names={names} />} />
              : <Static key={k} action={e.el.content} files={files} />)}
          <AddMenu onAdd={t => ctl.add(t, i)} />
          {!list.length && names.length > 1 && (
            <button className="link danger" onClick={() => { ctl.removeSlot(i); setI(Math.max(0, i - 1)) }}>Supprimer ce chapitre vide</button>
          )}
        </article>
      </div>
    )
  },
}
