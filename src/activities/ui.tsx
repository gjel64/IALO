import { useState } from 'react'

// H5P stores rich text as HTML; teachers edit plain text.
export const toText = (html = '') =>
  new DOMParser().parseFromString(html.replace(/<br\s*\/?>|<\/p>\s*<p>/g, '\n'), 'text/html').body.textContent ?? ''
export const toHtml = (text: string) =>
  `<p>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>`

type EditableProps = { value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; className?: string }

// Text that looks like the student view and becomes editable on click.
export const Editable = ({ value, onChange, placeholder = 'Cliquez pour écrire…', multiline, className = '' }: EditableProps) => (
  <span
    key={value}
    className={`editable ${className}`}
    contentEditable="plaintext-only"
    suppressContentEditableWarning
    role="textbox"
    aria-label={placeholder}
    aria-multiline={multiline}
    data-placeholder={placeholder}
    onBlur={e => { const v = e.currentTarget.innerText.replace(/\n$/, ''); if (v !== value) onChange(v) }}
    onKeyDown={e => { if (e.key === 'Enter' && !multiline) { e.preventDefault(); e.currentTarget.blur() } }}
  >{value}</span>
)

export const EditableHtml = ({ value, onChange, ...rest }: EditableProps) =>
  <Editable {...rest} value={toText(value)} onChange={v => onChange(toHtml(v))} />

// Text where *words* are the answers: click a word to toggle it, or edit the raw text.
export const answerOf = (blank: string) => blank.slice(1, -1).split(':')[0].split('/')[0]
const TOKENS = /(\*[^*]+\*|[\p{L}\p{N}]+)/u

export function WordText({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [raw, setRaw] = useState(!value)
  const parts = value.split(TOKENS)
  const toggle = (i: number) => onChange(parts.map((t, j) => (j !== i ? t : t.startsWith('*') ? t.slice(1, -1) : `*${t}*`)).join(''))
  return (
    <div className="word-text">
      {raw
        ? <Editable multiline value={value} onChange={onChange} placeholder="Écrivez le texte, puis cliquez sur « Terminer »…" />
        : <p>{parts.map((t, i) => (i % 2 ? <span key={i} className={t.startsWith('*') ? 'blank' : 'word'} onClick={() => toggle(i)}>{t.startsWith('*') ? answerOf(t) : t}</span> : t))}</p>}
      <small className="hint">
        {raw ? 'Astuce : entourez un mot d’*astérisques* pour le cacher.' : 'Cliquez sur un mot pour le cacher / le révéler.'}{' '}
        <button className="link" onClick={() => setRaw(!raw)}>{raw ? '✓ Terminer' : '✎ Modifier le texte'}</button>
      </small>
    </div>
  )
}
