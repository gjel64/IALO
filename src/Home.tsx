import { DropZone, Heading } from './components'
import { ACCEPT } from './create/sources'

interface Props { error: string; onOpen(file: File): void; onCreate(files: File[]): void }

export function Home({ error, onOpen, onCreate }: Props) {
  // Whatever the zone, a .h5p opens in the editor and anything else starts a new content.
  const route = (files: File[]) => {
    const h5p = files.find(f => /\.h5p$/i.test(f.name))
    if (h5p) onOpen(h5p)
    else if (files.length) onCreate(files)
  }
  return (
    <main className="home">
      <Heading title="Accueil">Que souhaitez-vous faire ?</Heading>
      <p className="lead">Ajoutez des activités (QCM, vrai / faux, texte à trous, glisser les mots) à vos contenus H5P.</p>
      <p role="alert" className="error">{error}</p>
      <div className="choices">
        <section className="card" aria-labelledby="edit-title">
          <h2 id="edit-title"><span aria-hidden="true">✏️</span> Modifier un H5P existant</h2>
          <p>Ouvrez une vidéo interactive, une présentation ou un livre interactif pour ajouter ou corriger ses activités.</p>
          <DropZone accept=".h5p" onFiles={route} label="Ouvrir un fichier .h5p" />
        </section>
        <section className="card" aria-labelledby="create-title">
          <h2 id="create-title"><span aria-hidden="true">✨</span> Créer à partir de mes supports</h2>
          <p>Partez d’une vidéo, d’un PowerPoint, d’un PDF ou d’images, puis ajoutez-y vos activités.</p>
          <DropZone accept={ACCEPT} multiple onFiles={route} label="Choisir mes fichiers" />
          <button className="link" onClick={() => onCreate([])}>J’ai plutôt un lien YouTube</button>
        </section>
      </div>
    </main>
  )
}
