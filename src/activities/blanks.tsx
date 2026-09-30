import type { ActivityType } from './types'
import { EditableHtml, WordText, toHtml, toText } from './ui'

interface P { text: string; questions: string[] }

export const blanks: ActivityType<P> = {
  machineName: 'H5P.Blanks', version: '1.14', label: 'Texte à trous', icon: '✏️',
  create: () => ({ text: '<p>Complétez le texte.</p>', questions: [] }),
  Edit: ({ p, set }) => (
    <>
      <EditableHtml className="question" value={p.text} onChange={text => set({ ...p, text })} placeholder="Consigne…" />
      <WordText value={p.questions.map(toText).join('\n')} onChange={v => set({ ...p, questions: v.split('\n').map(toHtml) })} />
    </>
  ),
}
