import { useId, useState } from 'react'
import type { ActivityType } from './types'
import { Icon } from '../icons'
import { Checker, mark } from './play'
import { Editable, EditableHtml, toHtml, toText } from './ui'

interface Answer { text: string; correct: boolean; tipsAndFeedback?: any }
interface P { question: string; answers: Answer[] }

export const multiChoice: ActivityType<P> = {
  machineName: 'H5P.MultiChoice', version: '1.16', label: 'QCM', icon: 'list',
  create: () => ({ question: '', answers: [{ text: '', correct: true }, { text: '', correct: false }] }),
  Edit: ({ p, set }) => {
    const answer = (i: number, a: Partial<Answer>) => set({ ...p, answers: p.answers.map((x, j) => (j === i ? { ...x, ...a } : x)) })
    return (
      <>
        <EditableHtml className="question" value={p.question} onChange={question => set({ ...p, question })} placeholder="Écrivez la question…" />
        {p.answers.map((a, i) => (
          <div key={i} className={a.correct ? 'choice ok' : 'choice'}>
            <button className="check" title="Bonne réponse ?" onClick={() => answer(i, { correct: !a.correct })}>{a.correct && <Icon name="check" size={14} />}</button>
            <Editable value={toText(a.text)} onChange={v => answer(i, { text: toHtml(v) })} placeholder={`Réponse ${i + 1}`} />
            <button className="del" title="Supprimer la réponse" aria-label="Supprimer la réponse" onClick={() => set({ ...p, answers: p.answers.filter((_, j) => j !== i) })}><Icon name="close" size={14} /></button>
          </div>
        ))}
        <button className="link" onClick={() => set({ ...p, answers: [...p.answers, { text: '', correct: false }] })}>+ Ajouter une réponse</button>
        <small className="hint">Cochez les bonnes réponses.</small>
      </>
    )
  },
  Play: ({ p }) => {
    const name = useId()
    const [picked, setPicked] = useState<number[]>([])
    const [checked, setChecked] = useState(false)
    const total = p.answers.filter(a => a.correct).length
    const single = total === 1
    // Like H5P: one point per right answer ticked, minus one per wrong answer ticked.
    const score = Math.max(0, picked.reduce((n, i) => n + (p.answers[i].correct ? 1 : -1), 0))
    const toggle = (i: number) => setPicked(single ? [i] : picked.includes(i) ? picked.filter(x => x !== i) : [...picked, i])
    return (
      <fieldset className="plain">
        <legend className="question">{toText(p.question)}</legend>
        {p.answers.map((a, i) => (
          <label key={i} className={'choice' + (picked.includes(i) ? mark(checked, a.correct) : checked && a.correct ? ' missed' : '')}>
            <input type={single ? 'radio' : 'checkbox'} name={name} checked={picked.includes(i)} disabled={checked} onChange={() => toggle(i)} />
            <span>{toText(a.text)}</span>
          </label>
        ))}
        <Checker checked={checked} score={score} total={total} onCheck={() => setChecked(true)} onRetry={() => { setPicked([]); setChecked(false) }} />
      </fieldset>
    )
  },
}
