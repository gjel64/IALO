import { useState } from 'react'
import type { ActivityType } from './types'
import { BLANK, Checker, mark } from './play'
import { EditableHtml, WordText, answerOf, toText } from './ui'

interface P { taskDescription: string; textField: string }

export const dragText: ActivityType<P> = {
  machineName: 'H5P.DragText', version: '1.10', label: 'Glisser les mots', icon: 'drag',
  create: () => ({ taskDescription: '<p>Glissez les mots au bon endroit.</p>', textField: '' }),
  Edit: ({ p, set }) => (
    <>
      <EditableHtml className="question" value={p.taskDescription} onChange={taskDescription => set({ ...p, taskDescription })} placeholder="Consigne…" />
      <div className="bank">{(p.textField.match(/\*[^*]+\*/g) ?? []).map(answerOf).sort().map((w, i) => <span key={i} className="chip">{w}</span>)}</div>
      <WordText value={p.textField} onChange={textField => set({ ...p, textField })} />
    </>
  ),
  Play: ({ p }) => {
    const parts = p.textField.split(BLANK)
    const answers = parts.filter((_, i) => i % 2).map(answerOf)
    const [bank] = useState(() => answers.map((_, i) => i).sort(() => Math.random() - .5))
    const [filled, setFilled] = useState<(number | undefined)[]>(() => answers.map(() => undefined)) // blank → word
    const [picked, setPicked] = useState<number>()
    const [checked, setChecked] = useState(false)
    const place = (b: number, w?: number) => { setFilled(filled.map((x, i) => (i === b ? w : x === w ? undefined : x))); setPicked(undefined) }
    const right = (b: number) => filled[b] !== undefined && answers[filled[b]!] === answers[b]
    let k = 0
    return (
      <>
        <p className="question">{toText(p.taskDescription)}</p>
        <div className="bank" role="group" aria-label="Mots à placer">
          {bank.filter(w => !filled.includes(w)).map(w => (
            <button
              key={w} className="chip" aria-pressed={picked === w} disabled={checked} draggable={!checked}
              onClick={() => setPicked(picked === w ? undefined : w)} onDragStart={e => e.dataTransfer.setData('text/plain', String(w))}
            >{answers[w]}</button>
          ))}
        </div>
        <p className="play-text">
          {parts.map((t, i) => {
            if (!(i % 2)) return t
            const b = k++
            const w = filled[b]
            return (
              <button
                key={i} className={'gap drop' + (w === undefined ? ' empty' : '') + mark(checked, right(b))} disabled={checked}
                aria-label={`Trou ${b + 1} : ${w === undefined ? 'vide' : answers[w]}`}
                onClick={() => (picked !== undefined ? place(b, picked) : w !== undefined && place(b, undefined))}
                onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); place(b, +e.dataTransfer.getData('text/plain')) }}
              >{w === undefined ? '\u00a0' : answers[w]}</button>
            )
          })}
        </p>
        {!checked && <small className="hint">Glissez un mot dans un trou, ou cliquez sur le mot puis sur le trou. Cliquez sur un mot placé pour le retirer.</small>}
        <Checker checked={checked} score={answers.filter((_, b) => right(b)).length} total={answers.length} onCheck={() => setChecked(true)} onRetry={() => { setFilled(answers.map(() => undefined)); setChecked(false) }} />
      </>
    )
  },
}
