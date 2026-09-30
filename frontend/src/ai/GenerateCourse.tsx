import { useState, type FormEvent } from 'react'
import { activities } from '../activities'
import { Icon } from '../icons'
import { generateCourse, type Generated, type Section } from './api'

interface Props { title: string; sections: Section[]; onDone(generated: Generated[]): void; onClose(): void }

export function GenerateCourse({ title, sections, onDone, onClose }: Props) {
  const withText = sections.filter(s => s.text).length
  const [count, setCount] = useState(Math.min(10, Math.max(1, withText)))
  const [instructions, setInstructions] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const types = activities.filter(a => a.fromAI).map(a => a.machineName)
      onDone(await generateCourse({ title, sections, types, count, instructions }))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="notice ai-panel" onSubmit={submit} aria-busy={busy}>
      <span className="notice-icon"><Icon name="sparkle" /></span>
      <div>
        <b>Générer des activités avec l’IA.</b>{' '}
        {withText
          ? 'L’IA lit le texte de vos pages et propose des activités, que vous pourrez relire et modifier.'
          : 'Ce contenu ne contient pas de texte que l’IA peut lire (images sans description).'}
        {withText > 0 && (
          <fieldset className="plain ai-fields" disabled={busy}>
            <div className="field">
              <label htmlFor="ai-count">Nombre d’activités</label>
              <input id="ai-count" type="number" min={1} max={30} value={count} onChange={e => setCount(Math.min(30, Math.max(1, +e.target.value || 1)))} />
            </div>
            <div className="field grow">
              <label htmlFor="ai-instructions">Consignes <small>(facultatif)</small></label>
              <input id="ai-instructions" value={instructions} maxLength={2000} placeholder="Ex. : niveau 5e, insister sur le vocabulaire" onChange={e => setInstructions(e.target.value)} />
            </div>
            <button type="submit" className="primary"><Icon name="sparkle" /> Générer</button>
          </fieldset>
        )}
        <p role="status" className="ai-status">{busy && <><progress aria-label="Génération en cours" /> Génération en cours… Cela peut prendre une à deux minutes.</>}</p>
        <p role="alert" className="error">{error}</p>
      </div>
      <button type="button" className="ghost" onClick={onClose} disabled={busy}>Fermer</button>
    </form>
  )
}
