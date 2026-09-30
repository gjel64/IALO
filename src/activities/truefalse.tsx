import type { ActivityType } from './types'
import { EditableHtml } from './ui'

interface P { question: string; correct: 'true' | 'false' }

export const trueFalse: ActivityType<P> = {
  machineName: 'H5P.TrueFalse', version: '1.8', label: 'Vrai / Faux', icon: '⚖️',
  create: () => ({ question: '', correct: 'true' }),
  Edit: ({ p, set }) => (
    <>
      <EditableHtml className="question" value={p.question} onChange={question => set({ ...p, question })} placeholder="Écrivez l'affirmation…" />
      {([['true', 'Vrai'], ['false', 'Faux']] as const).map(([v, l]) => (
        <div key={v} className={p.correct === v ? 'choice ok' : 'choice'} onClick={() => set({ ...p, correct: v })}>
          <span className="check">{p.correct === v && '✓'}</span>{l}
        </div>
      ))}
      <small className="hint">Cliquez sur la bonne réponse.</small>
    </>
  ),
}
