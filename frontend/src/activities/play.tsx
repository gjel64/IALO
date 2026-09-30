import { Icon } from '../icons'

// Accepted answers of a *blank*: "*Paris/paris:tip*" → ["paris"].
const norm = (s: string) => s.trim().toLowerCase()
export const accepted = (blank: string) => blank.slice(1, -1).split(':')[0].split('/').map(norm)
export const isRight = (blank: string, value: string) => accepted(blank).includes(norm(value))
export const BLANK = /(\*[^*]+\*)/

// Student-side footer: check the answers, read the score, try again.
export function Checker({ checked, score, total, onCheck, onRetry }: { checked: boolean; score: number; total: number; onCheck(): void; onRetry(): void }) {
  return (
    <div className="checker">
      {checked
        ? <button onClick={onRetry}><Icon name="retry" /> Recommencer</button>
        : <button className="primary" onClick={onCheck} disabled={!total}>Vérifier</button>}
      <p role="status" className={score === total ? 'score full' : 'score'}>{checked && `Score : ${score} / ${total}`}</p>
    </div>
  )
}

// Visual state of an answer once checked.
export const mark = (checked: boolean, ok: boolean) => (!checked ? '' : ok ? ' ok' : ' ko')
