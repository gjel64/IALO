import { useId, useState } from 'react'
import type { ActivityType } from './types'
import { Icon } from '../icons'
import { Checker, mark } from './play'
import { EditableHtml, toText } from './ui'

interface P { question: string; correct: 'true' | 'false' }

export const trueFalse: ActivityType<P> = {
  machineName: 'H5P.TrueFalse', version: '1.8', label: 'Vrai / Faux', icon: 'toggle',
  create: () => ({ question: '', correct: 'true' }),
  Edit: ({ p, set }) => (
    <>
      <EditableHtml className="question" value={p.question} onChange={question => set({ ...p, question })} placeholder="Écrivez l'affirmation…" />
      {([['true', 'Vrai'], ['false', 'Faux']] as const).map(([v, l]) => (
        <div key={v} className={p.correct === v ? 'choice ok' : 'choice'} onClick={() => set({ ...p, correct: v })}>
          <span className="check">{p.correct === v && <Icon name="check" size={14} />}</span>{l}
        </div>
      ))}
      <small className="hint">Cliquez sur la bonne réponse.</small>
    </>
  ),
  Play: ({ p }) => {
    const name = useId()
    const [picked, setPicked] = useState<string>()
    const [checked, setChecked] = useState(false)
    return (
      <fieldset className="plain">
        <legend className="question">{toText(p.question)}</legend>
        {([['true', 'Vrai'], ['false', 'Faux']] as const).map(([v, l]) => (
          <label key={v} className={'choice' + (picked === v ? mark(checked, v === p.correct) : '')}>
            <input type="radio" name={name} checked={picked === v} disabled={checked} onChange={() => setPicked(v)} />
            <span>{l}</span>
          </label>
        ))}
        <Checker checked={checked} score={+(picked === p.correct)} total={1} onCheck={() => setChecked(true)} onRetry={() => { setPicked(undefined); setChecked(false) }} />
      </fieldset>
    )
  },
}
