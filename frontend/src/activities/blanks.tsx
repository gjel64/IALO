import { useState } from 'react'
import type { ActivityType } from './types'
import { BLANK, Checker, isRight, mark } from './play'
import { EditableHtml, WordText, answerOf, toHtml, toText } from './ui'

interface P { text: string; questions: string[] }

export const blanks: ActivityType<P> = {
  machineName: 'H5P.Blanks', version: '1.14', label: 'Texte à trous', icon: 'blanks',
  create: () => ({ text: '<p>Complétez le texte.</p>', questions: [] }),
  fromAI: d => ({ text: toHtml(d.instruction), questions: d.text.split('\n').filter((l: string) => l.trim()).map(toHtml) }),
  Edit: ({ p, set }) => (
    <>
      <EditableHtml className="question" value={p.text} onChange={text => set({ ...p, text })} placeholder="Consigne…" />
      <WordText value={p.questions.map(toText).join('\n')} onChange={v => set({ ...p, questions: v.split('\n').map(toHtml) })} />
    </>
  ),
  Play: ({ p }) => {
    const lines = p.questions.map(q => toText(q).split(BLANK))
    const blanks = lines.flatMap(l => l.filter((_, i) => i % 2))
    const [values, setValues] = useState(() => blanks.map(() => ''))
    const [checked, setChecked] = useState(false)
    let k = 0
    return (
      <>
        <p className="question">{toText(p.text)}</p>
        <div className="play-text">
          {lines.map((parts, l) => (
            <p key={l}>
              {parts.map((t, i) => {
                if (!(i % 2)) return t
                const n = k++
                return (
                  <span key={i}>
                    <input
                      className={'gap' + mark(checked, isRight(t, values[n]))} aria-label={`Trou ${n + 1}`} size={Math.max(4, answerOf(t).length + 1)}
                      value={values[n]} readOnly={checked} onChange={e => setValues(values.map((v, j) => (j === n ? e.target.value : v)))}
                    />
                    {checked && !isRight(t, values[n]) && <span className="solution"><span className="sr-only">Réponse attendue : </span>{answerOf(t)}</span>}
                  </span>
                )
              })}
            </p>
          ))}
        </div>
        <Checker checked={checked} score={blanks.filter((b, n) => isRight(b, values[n])).length} total={blanks.length} onCheck={() => setChecked(true)} onRetry={() => { setValues(blanks.map(() => '')); setChecked(false) }} />
      </>
    )
  },
}
