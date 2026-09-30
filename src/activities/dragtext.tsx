import type { ActivityType } from './types'
import { EditableHtml, WordText, answerOf } from './ui'

interface P { taskDescription: string; textField: string }

export const dragText: ActivityType<P> = {
  machineName: 'H5P.DragText', version: '1.10', label: 'Glisser les mots', icon: '🧩',
  create: () => ({ taskDescription: '<p>Glissez les mots au bon endroit.</p>', textField: '' }),
  Edit: ({ p, set }) => (
    <>
      <EditableHtml className="question" value={p.taskDescription} onChange={taskDescription => set({ ...p, taskDescription })} placeholder="Consigne…" />
      <div className="bank">{(p.textField.match(/\*[^*]+\*/g) ?? []).map(answerOf).sort().map((w, i) => <span key={i} className="chip">{w}</span>)}</div>
      <WordText value={p.textField} onChange={textField => set({ ...p, textField })} />
    </>
  ),
}
