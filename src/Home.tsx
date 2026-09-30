import { DropZone, Heading } from './components'
import { ACCEPT } from './create/sources'
import { Icon } from './icons'

interface Props { error: string; onOpen(file: File): void; onCreate(files: File[]): void }

export function Home({ error, onOpen, onCreate }: Props) {
  // Whatever the zone, a .h5p opens in the editor and anything else starts a new content.
  const route = (files: File[]) => {
    const h5p = files.find(f => /\.h5p$/i.test(f.name))
    if (h5p) onOpen(h5p)
    else if (files.length) onCreate(files)
  }
  return (
    <div className="app">
      <header><span className="brand">IALO</span><span className="brand-sub">Éditeur H5P</span></header>
      <main className="home">
        <Heading title="Accueil">Que souhaitez-vous faire ?</Heading>
        <p role="alert" className="error">{error}</p>
        <div className="choices">
          <section className="card" aria-labelledby="edit-title">
            <span className="card-icon"><Icon name="edit" size={20} /></span>
            <h2 id="edit-title">Modifier un H5P existant</h2>
            <DropZone accept=".h5p" onFiles={route} label="Ouvrir un fichier .h5p" />
          </section>
          <section className="card" aria-labelledby="create-title">
            <span className="card-icon"><Icon name="plus" size={20} /></span>
            <h2 id="create-title">Créer à partir de mes supports</h2>
            <p>vidéo, PowerPoint, PDF</p>
            <DropZone accept={ACCEPT} multiple onFiles={route} label="Choisir mes fichiers" />
            <button className="link" onClick={() => onCreate([])}><Icon name="link" size={14} /> J’ai plutôt un lien YouTube</button>
          </section>
        </div>
      </main>
    </div>
  )
}
