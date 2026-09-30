import { useEffect, useState } from 'react'
import { activityOf } from './activities'
import type { ActivityType } from './activities/types'
import { generateActivity, sections, type Generated } from './ai/api'
import { GenerateCourse } from './ai/GenerateCourse'
import { Heading } from './components'
import { containers } from './containers'
import { read, write } from './containers/model'
import type { Ctl, Item } from './containers/types'
import { Create } from './create/Create'
import { load, save, type H5PPackage } from './h5p/package'
import { Home } from './Home'
import { Icon } from './icons'

export default function App() {
  const [creating, setCreating] = useState<File[]>() // set while on the "create from sources" screen
  const [pkg, setPkg] = useState<H5PPackage>()
  const [name, setName] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [selected, setSelected] = useState<string>()
  const [dirty, setDirty] = useState(false)
  const [welcome, setWelcome] = useState<string[]>() // shown once a content has just been created
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(false) // student view: activities answerable, editing tools hidden
  const [generating, setGenerating] = useState(false) // AI panel open
  const container = pkg && containers[pkg.meta.mainLibrary]
  const ai = pkg?.meta.mainLibrary !== 'H5P.InteractiveVideo' // a video has no text for the AI to read

  // A file dropped next to a drop zone must not make the browser leave the app.
  useEffect(() => {
    const stop = (e: DragEvent) => e.preventDefault()
    addEventListener('dragover', stop)
    addEventListener('drop', stop)
    return () => { removeEventListener('dragover', stop); removeEventListener('drop', stop) }
  }, [])

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    addEventListener('beforeunload', warn)
    return () => removeEventListener('beforeunload', warn)
  }, [dirty])

  function edit(p: H5PPackage, fileName: string, created?: string[]) {
    const c = containers[p.meta.mainLibrary]
    if (!c) throw new Error(`Ce type de contenu n’est pas pris en charge (${p.meta.mainLibrary}). Types acceptés : vidéo interactive, présentation, livre interactif.`)
    setPkg(p); setName(fileName); setItems(read(c, p.content)); setSelected(undefined)
    setDirty(!!created); setWelcome(created); setPreview(false); setGenerating(false); setStatus(''); setError(''); setCreating(undefined)
  }

  async function open(file: File) {
    let p: H5PPackage
    try { p = await load(file) } catch { return setError(`« ${file.name} » n’est pas un fichier .h5p valide.`) }
    try { edit(p, file.name) } catch (e) { setError((e as Error).message) }
  }

  function home() {
    if (dirty && !confirm('Vos modifications ne sont pas enregistrées. Quitter quand même ?')) return
    setPkg(undefined); setDirty(false)
  }

  async function exportFile() {
    const blob = await save(pkg!, write(container!, pkg!.content, items), [...new Set(items.map(i => i.action.library))])
    Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name }).click()
    setDirty(false)
    setStatus(`« ${name} » enregistré dans vos téléchargements`)
  }

  const change = (f: (prev: Item[]) => Item[]) => { setItems(f); setDirty(true); setStatus('') }
  const newItem = (type: ActivityType, pos: number, params: any): Item => {
    const id = crypto.randomUUID()
    const library = `${type.machineName} ${pkg!.versions[type.machineName] ?? type.version}`
    return { id, pos, action: { library, params, subContentId: id, metadata: { contentType: type.label, license: 'U', title: type.label } } }
  }

  function addGenerated(generated: Generated[]) {
    const added = generated.flatMap(g => { const t = activityOf(g.type); return t?.fromAI ? [newItem(t, g.section, t.fromAI(g.data))] : [] })
    change(prev => [...prev, ...added])
    setGenerating(false); setWelcome(undefined)
    setStatus(`${added.length} activité${added.length > 1 ? 's ajoutées' : ' ajoutée'} par l’IA : relisez-les avant d’enregistrer`)
  }

  const ctl: Ctl = {
    selected,
    select: setSelected,
    add(type, pos, params = type.create()) {
      const item = newItem(type, pos, params)
      change(prev => [...prev, item])
      setSelected(item.id)
    },
    update: (id, patch) => change(prev => prev.map(i => (i.id === id ? { ...i, ...patch } : i))),
    remove: id => change(prev => prev.filter(i => i.id !== id)),
    // Slides / chapters live in the content itself; activities keep pointing at their original wrapper, so it is mutated in place.
    edit(fn) { fn(pkg!.content); setPkg({ ...pkg! }); setDirty(true); setStatus('') },
    insertSlot(at) {
      container!.slotList!(pkg!.content).splice(at, 0, container!.newSlot!(pkg!.content))
      change(prev => prev.map(i => (i.pos >= at ? { ...i, pos: i.pos + 1 } : i)))
    },
    removeSlot(at) {
      container!.slotList!(pkg!.content).splice(at, 1)
      change(prev => prev.map(i => (i.pos > at ? { ...i, pos: i.pos - 1 } : i)))
    },
    generate: ai ? async id => {
      const it = items.find(i => i.id === id)!
      const t = activityOf(it.action.library)!
      const data = await generateActivity({ type: t.machineName, title: pkg!.meta.title, section: sections(container!, pkg!.content)[container!.slot(it.pos)] })
      change(prev => prev.map(i => (i.id === id ? { ...i, action: { ...i.action, params: t.fromAI!(data) } } : i)))
    } : undefined,
  }

  if (creating) return <Create initial={creating} onBack={() => setCreating(undefined)} onCreated={(p, fileName, warnings) => edit(p, fileName, warnings)} />

  if (!pkg || !container) return <Home error={error} onOpen={open} onCreate={files => { setError(''); setCreating(files) }} />

  return (
    <div className="app">
      <header>
        <button className="ghost" onClick={home}><Icon name="back" /> Accueil</button>
        <span className="divider" aria-hidden="true" />
        <Heading title={pkg.meta.title} className="doc-title">{pkg.meta.title} <small>{container.label}</small></Heading>
        <div className="segmented" role="group" aria-label="Affichage">
          {([[false, 'edit', 'Édition'], [true, 'eye', 'Vue élève']] as const).map(([on, icon, label]) => (
            <button key={label} aria-pressed={preview === on} onClick={() => { setPreview(on); setSelected(undefined) }}><Icon name={icon} /> {label}</button>
          ))}
        </div>
        <span role="status" className="saved">{status}</span>
        {ai && !preview && <button onClick={() => setGenerating(true)} aria-expanded={generating}><Icon name="sparkle" /> Générer avec l’IA</button>}
        <button className="primary" onClick={exportFile}><Icon name="download" /> Enregistrer le .h5p</button>
      </header>
      {preview && (
        <div className="notice preview-notice">
          <span className="notice-icon"><Icon name="eye" /></span>
          <div><b>Vue élève.</b> Testez le contenu comme vos élèves le verront. Les réponses données ici ne sont pas enregistrées.</div>
          <button className="ghost" onClick={() => setPreview(false)}>Revenir à l’édition</button>
        </div>
      )}
      {generating && !preview && (
        <GenerateCourse title={pkg.meta.title} sections={sections(container, pkg.content)} onDone={addGenerated} onClose={() => setGenerating(false)} />
      )}
      {welcome && !preview && !generating && (
        <div className="notice">
          <span className="notice-icon"><Icon name="check" /></span>
          <div>
            <b>Votre contenu est prêt.</b> {container.hint}
            {welcome.length > 0 && <ul>{welcome.map((w, k) => <li key={k}>{w}</li>)}</ul>}
          </div>
          <button className="ghost" onClick={() => setWelcome(undefined)}>Compris</button>
        </div>
      )}
      <main><container.View content={pkg.content} items={items} files={pkg.files} ctl={ctl} preview={preview} /></main>
    </div>
  )
}
