import { useEffect, useRef, useState, type FormEvent } from 'react'
import { DropZone, Heading } from '../components'
import type { H5PPackage } from '../h5p/package'
import { Icon, type IconName } from '../icons'
import { build, type Format } from './build'
import { ACCEPT, baseName, isVideo, isYouTube, kindOf, type Kind, type Source } from './sources'

const FORMATS: { id: Format; icon: IconName; label: string; desc: string; needs: string; ok: (s: Source[]) => boolean }[] = [
  {
    id: 'video', icon: 'video', label: 'Vidéo interactive',
    desc: 'La vidéo se met en pause pour poser vos questions au bon moment.',
    needs: 'Nécessite une seule vidéo, sans autre fichier.',
    ok: s => s.length === 1 && isVideo(s[0]),
  },
  {
    id: 'slides', icon: 'slides', label: 'Présentation',
    desc: 'Une diapo par page ou par diapo PowerPoint. Les activités s’ajoutent sur les diapos.',
    needs: 'Nécessite un PowerPoint, un PDF ou des images (sans vidéo).',
    ok: s => s.length > 0 && !s.some(isVideo),
  },
  {
    id: 'book', icon: 'book', label: 'Livre interactif',
    desc: 'Un chapitre par page ou par diapo, à lire en défilant. Les activités se placent entre les contenus.',
    needs: 'Nécessite un PowerPoint, un PDF ou des images (sans vidéo).',
    ok: s => s.length > 0 && !s.some(isVideo),
  },
]

const recommend = (s: Source[]): Format | undefined =>
  !s.length ? undefined : s.some(isVideo) ? (s.length === 1 ? 'video' : undefined) : s.every(x => x.kind === 'pdf') ? 'book' : 'slides'

const KIND: Record<Kind, [IconName, string]> = {
  video: ['video', 'Vidéo'], youtube: ['play', 'Vidéo YouTube'], pdf: ['pdf', 'PDF'], pptx: ['slides', 'PowerPoint'], image: ['image', 'Image'],
}

// Unsupported files get a hint on how to make them usable.
const HELP: [RegExp, string][] = [
  [/\.(ppt|odp|key)$/i, 'enregistrez-le au format .pptx ou exportez-le en PDF'],
  [/\.(docx?|odt|rtf|pages)$/i, 'exportez-le en PDF'],
  [/\.(mov|avi|mkv|wmv|flv)$/i, 'convertissez la vidéo en .mp4'],
  [/\.h5p$/i, 'pour modifier un .h5p, revenez à l’accueil et choisissez « Modifier un H5P existant »'],
]
const why = (name: string) => HELP.find(([re]) => re.test(name))?.[1] ?? 'ce format n’est pas pris en charge'

function accept(files: File[]) {
  const ok = files.filter(f => kindOf(f.name))
  const ko = files.filter(f => !kindOf(f.name))
  return {
    sources: ok.map((file): Source => ({ id: crypto.randomUUID(), kind: kindOf(file.name)!, name: file.name, file, alt: '' })),
    notice: [
      ok.length ? `${ok.length} fichier${ok.length > 1 ? 's ajoutés' : ' ajouté'}.` : '',
      ...ko.map(f => `« ${f.name} » n’a pas été ajouté : ${why(f.name)}.`),
    ].join(' '),
  }
}

const size = (b: number) => (b >= 1e6 ? `${(b / 1e6).toFixed(1).replace('.', ',')} Mo` : `${Math.ceil(b / 1e3)} ko`)
const suggestTitle = (s?: Source) => {
  if (!s) return ''
  if (s.url) return 'Vidéo interactive'
  const t = baseName(s.name).replace(/[_-]+/g, ' ').trim()
  return t.charAt(0).toUpperCase() + t.slice(1)
}

interface Props { initial: File[]; onBack(): void; onCreated(pkg: H5PPackage, fileName: string, warnings: string[]): void }

export function Create({ initial, onBack, onCreated }: Props) {
  const [sources, setSources] = useState(() => accept(initial).sources)
  const [notice, setNotice] = useState(() => accept(initial).notice)
  const [chosen, setChosen] = useState<Format>()
  const [title, setTitle] = useState<string>()
  const [link, setLink] = useState('')
  const [linkError, setLinkError] = useState('')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState<string>()
  const status = useRef<HTMLDivElement>(null)
  const titleInput = useRef<HTMLInputElement>(null)

  // Keep keyboard focus in place when list items move or disappear.
  const focusNext = useRef<string>(undefined)
  useEffect(() => {
    if (focusNext.current) document.getElementById(focusNext.current)?.focus()
    focusNext.current = undefined
  })

  const recommended = recommend(sources)
  const format = chosen && FORMATS.find(f => f.id === chosen)!.ok(sources) ? chosen : recommended
  const finalTitle = (title ?? suggestTitle(sources[0])).trim()

  function addFiles(files: File[]) {
    const got = accept(files)
    setSources(prev => [...prev, ...got.sources])
    setNotice(got.notice)
    setError('')
  }

  function addLink() {
    const url = link.trim()
    let kind: Kind | undefined
    try { kind = isYouTube(url) ? 'youtube' : kindOf(new URL(url).pathname) === 'video' ? 'video' : undefined } catch { /* not a URL */ }
    if (!kind) return setLinkError('Ce lien n’est ni une vidéo YouTube ni un fichier vidéo (.mp4, .webm). Copiez l’adresse complète, qui commence par https://')
    setSources(prev => [...prev, { id: crypto.randomUUID(), kind, name: url, url, alt: '' }])
    setLink(''); setLinkError(''); setError('')
    setNotice('Lien vidéo ajouté.')
  }

  function move(i: number, d: -1 | 1) {
    const j = i + d
    if (j < 0 || j >= sources.length) return
    const next = [...sources];
    [next[i], next[j]] = [next[j], next[i]]
    setSources(next)
    focusNext.current = `${sources[i].id}-${d < 0 ? 'up' : 'down'}`
    setNotice(`« ${sources[i].name} » est maintenant en position ${j + 1} sur ${sources.length}.`)
  }

  function remove(i: number) {
    const s = sources[i], neighbour = sources[i + 1] ?? sources[i - 1]
    setSources(sources.filter((_, k) => k !== i))
    focusNext.current = neighbour ? `${neighbour.id}-remove` : 'add-files'
    setNotice(`« ${s.name} » a été retiré.`)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!sources.length) return setError('Ajoutez au moins un support : une vidéo, un PowerPoint, un PDF ou une image.')
    if (!format) return setError('Une vidéo interactive se crée à partir d’une seule vidéo. Retirez les autres fichiers, ou retirez la vidéo pour créer une présentation ou un livre.')
    if (!finalTitle) { titleInput.current?.focus(); return setError('Donnez un titre à votre contenu.') }
    setError('')
    setProgress('Préparation…')
    status.current?.focus()
    try {
      const { pkg, warnings } = await build(format, finalTitle, sources, setProgress)
      onCreated(pkg, `${finalTitle.replace(/[\\/:*?"<>|]+/g, '-')}.h5p`, warnings)
    } catch (err) {
      setError(`La création a échoué : ${(err as Error).message}. Vérifiez que vos fichiers s’ouvrent correctement, puis réessayez.`)
      setProgress(undefined)
    }
  }

  const busy = progress !== undefined
  return (
    <div className="app">
      <header>
        <button className="ghost" onClick={onBack} disabled={busy}><Icon name="back" /> Accueil</button>
        <span className="divider" aria-hidden="true" />
        <span className="brand">IALO</span>
      </header>
      <main>
        <form className="create" onSubmit={submit} aria-busy={busy} noValidate>
          <Heading title="Créer un contenu">Créer un contenu interactif</Heading>
          <p className="lead">Trois étapes, puis vous ajouterez vos activités directement sur le contenu.</p>

          <fieldset className="plain" disabled={busy}>
            <section className="step" aria-labelledby="step1">
              <h2 id="step1"><span className="num">Étape 1</span> Ajoutez vos supports</h2>
              <p className="help">Vidéo (.mp4, .webm), PowerPoint (.pptx), PDF ou images. Vous pouvez en mettre plusieurs.</p>
              <DropZone id="add-files" accept={ACCEPT} multiple onFiles={addFiles} label={sources.length ? 'Ajouter d’autres fichiers' : 'Choisir mes fichiers'} />
              <p role="status" className="status">{notice}</p>

              <div className="field link-field">
                <label htmlFor="link">Ou collez le lien d’une vidéo YouTube</label>
                <div className="row">
                  <input
                    id="link" type="url" inputMode="url" placeholder="https://www.youtube.com/watch?v=…"
                    value={link} onChange={e => { setLink(e.target.value); setLinkError('') }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLink() } }}
                    aria-invalid={!!linkError} aria-describedby="link-error"
                  />
                  <button type="button" onClick={addLink} disabled={!link.trim()}>Ajouter le lien</button>
                </div>
                <p id="link-error" className="error">{linkError}</p>
              </div>

              {sources.length > 0 && (
                <>
                  <h3 id="list-title">Vos supports ({sources.length})</h3>
                  {sources.length > 1 && <p className="help">Ils seront mis bout à bout dans cet ordre.</p>}
                  <ol className="sources" aria-labelledby="list-title">
                    {sources.map((s, i) => (
                      <li key={s.id}>
                        <span className="icon"><Icon name={KIND[s.kind][0]} size={18} /></span>
                        <div className="meta">
                          <b>{s.name}</b>
                          <small>{KIND[s.kind][1]}{s.file && ` · ${size(s.file.size)}`}</small>
                          {s.kind === 'image' && (
                            <label className="alt">
                              Description de l’image <small>(lue aux élèves malvoyants)</small>
                              <input value={s.alt} placeholder="Ex. : schéma du cycle de l’eau" onChange={e => setSources(sources.map(x => (x.id === s.id ? { ...x, alt: e.target.value } : x)))} />
                            </label>
                          )}
                        </div>
                        {sources.length > 1 && (
                          <>
                            <button type="button" id={`${s.id}-up`} className="icon-btn" aria-label={`Monter « ${s.name} »`} aria-disabled={i === 0} onClick={() => move(i, -1)}><Icon name="up" /></button>
                            <button type="button" id={`${s.id}-down`} className="icon-btn" aria-label={`Descendre « ${s.name} »`} aria-disabled={i === sources.length - 1} onClick={() => move(i, 1)}><Icon name="down" /></button>
                          </>
                        )}
                        <button type="button" id={`${s.id}-remove`} onClick={() => remove(i)} aria-label={`Retirer « ${s.name} »`}>Retirer</button>
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </section>

            <fieldset className="step formats">
              <legend><h2><span className="num">Étape 2</span> Choisissez le format</h2></legend>
              {sources.length > 0 && !recommended && <p className="help warn">{FORMATS[0].needs} Pour une présentation ou un livre, retirez la vidéo.</p>}
              <div className="format-list">
                {FORMATS.map(f => {
                  const ok = !sources.length || f.ok(sources)
                  return (
                    <label key={f.id} className="format">
                      <input type="radio" name="format" value={f.id} checked={format === f.id} disabled={!ok} onChange={() => setChosen(f.id)} aria-describedby={`${f.id}-desc`} />
                      <span className="icon"><Icon name={f.icon} size={22} /></span>
                      <b>{f.label}{recommended === f.id && <span className="badge">Recommandé</span>}</b>
                      <small id={`${f.id}-desc`}>{ok ? f.desc : f.needs}</small>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            <section className="step" aria-labelledby="step3">
              <h2 id="step3"><span className="num">Étape 3</span> Donnez-lui un titre</h2>
              <div className="field">
                <label htmlFor="title">Titre vu par les élèves</label>
                <input id="title" ref={titleInput} value={title ?? suggestTitle(sources[0])} onChange={e => setTitle(e.target.value)} placeholder="Ex. : La photosynthèse" aria-invalid={error !== '' && !finalTitle} />
              </div>
            </section>
          </fieldset>

          <p role="alert" className="error">{error}</p>
          <div ref={status} role="status" tabIndex={-1} className={busy ? 'progress busy' : 'progress'}>
            {busy && <><progress aria-label="Création en cours" /> {progress}</>}
          </div>

          <div className="actions">
            <button type="submit" className="primary big" disabled={busy}>
              {busy ? 'Création en cours…' : <>Créer et ajouter des activités <Icon name="next" /></>}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
