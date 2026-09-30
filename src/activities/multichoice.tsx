import type { ActivityType } from './types'
import { Editable, EditableHtml, toHtml, toText } from './ui'

interface Answer { text: string; correct: boolean; tipsAndFeedback?: any }
interface P { question: string; answers: Answer[] }

export const multiChoice: ActivityType<P> = {
  machineName: 'H5P.MultiChoice', version: '1.16', label: 'QCM', icon: '☑️',
  create: () => ({ question: '', answers: [{ text: '', correct: true }, { text: '', correct: false }] }),
  Edit: ({ p, set }) => {
    const answer = (i: number, a: Partial<Answer>) => set({ ...p, answers: p.answers.map((x, j) => (j === i ? { ...x, ...a } : x)) })
    return (
      <>
        <EditableHtml className="question" value={p.question} onChange={question => set({ ...p, question })} placeholder="Écrivez la question…" />
        {p.answers.map((a, i) => (
          <div key={i} className={a.correct ? 'choice ok' : 'choice'}>
            <button className="check" title="Bonne réponse ?" onClick={() => answer(i, { correct: !a.correct })}>{a.correct && '✓'}</button>
            <Editable value={toText(a.text)} onChange={v => answer(i, { text: toHtml(v) })} placeholder={`Réponse ${i + 1}`} />
            <button className="del" title="Supprimer la réponse" onClick={() => set({ ...p, answers: p.answers.filter((_, j) => j !== i) })}>✕</button>
          </div>
        ))}
        <button className="link" onClick={() => set({ ...p, answers: [...p.answers, { text: '', correct: false }] })}>+ Ajouter une réponse</button>
        <small className="hint">Cochez les bonnes réponses.</small>
      </>
    )
  },
}
