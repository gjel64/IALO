// Generates .h5p files for testing the editor: node samples/make.mjs
// Content only (no bundled libraries): editable here, not playable in an H5P player.
import JSZip from 'jszip'
import { writeFileSync } from 'node:fs'

let n = 0
const act = (library, params) => ({ library, params, subContentId: `s${++n}`, metadata: { title: library.split(' ')[0] } })
const mc = (q, ok, ...ko) => act('H5P.MultiChoice 1.16', { question: `<p>${q}</p>`, answers: [...[ok].map(t => ({ text: `<div>${t}</div>`, correct: true })), ...ko.map(t => ({ text: `<div>${t}</div>`, correct: false }))] })
const tf = (q, correct) => act('H5P.TrueFalse 1.8', { question: `<p>${q}</p>`, correct: String(correct) })
const blanks = (...lines) => act('H5P.Blanks 1.14', { text: '<p>Complétez le texte.</p>', questions: lines.map(l => `<p>${l}</p>`) })
const drag = text => act('H5P.DragText 1.10', { taskDescription: '<p>Glissez les mots au bon endroit.</p>', textField: text })
const text = html => ({ library: 'H5P.AdvancedText 1.1', params: { text: html }, subContentId: `s${++n}` })

const samples = {
  'video-photosynthese': ['H5P.InteractiveVideo', {
    interactiveVideo: {
      video: { files: [{ path: 'https://www.youtube.com/watch?v=UPBMG5EYydo', mime: 'video/YouTube' }] },
      assets: { interactions: [
        { duration: { from: 5, to: 10 }, label: '<p>Intro</p>', action: text('<p>Regardez bien le schéma.</p>') },
        { duration: { from: 42, to: 52 }, action: mc('Quel gaz la plante absorbe-t-elle ?', 'Le CO₂', "L'oxygène", "L'azote") },
        { duration: { from: 95, to: 105 }, action: tf('La photosynthèse a lieu dans les mitochondries.', false) },
        { duration: { from: 150, to: 160 }, action: blanks('La photosynthèse produit du *glucose* et de l\'*oxygène*.', 'Elle a lieu dans les *chloroplastes/chloroplaste*.') },
        { duration: { from: 210, to: 220 }, action: drag('La *chlorophylle* capte la *lumière* pour transformer l\'*eau* et le *CO₂*.') },
      ] },
    },
  }],
  'presentation-revolution': ['H5P.CoursePresentation', {
    presentation: { slides: [
      { elements: [{ x: 5, y: 5, width: 90, height: 30, action: text('<h2>La Révolution française</h2>') }] },
      { elements: [
        { x: 5, y: 5, width: 90, height: 20, action: text('<p>1789 : prise de la Bastille.</p>') },
        { x: 5, y: 30, width: 90, height: 65, action: mc('En quelle année a eu lieu la prise de la Bastille ?', '1789', '1792', '1815') },
      ] },
      { elements: [{ x: 5, y: 5, width: 90, height: 90, action: tf('Louis XVI a été exécuté en 1793.', true) }] },
      { elements: [{ x: 5, y: 5, width: 90, height: 90, action: blanks('La *Déclaration des droits de l\'homme* est adoptée en *1789*.') }] },
      { elements: [] },
    ] },
  }],
  'livre-fractions': ['H5P.InteractiveBook', {
    chapters: [
      { library: 'H5P.Column 1.16', metadata: { title: 'Découvrir les fractions' }, params: { content: [
        { content: text('<p>Une fraction représente une partie d\'un tout.</p>') },
        { content: mc('Que vaut 1/2 + 1/4 ?', '3/4', '2/6', '1/6') },
        { content: tf('1/3 est plus grand que 1/2.', false) },
      ] } },
      { library: 'H5P.Column 1.16', metadata: { title: 'Vocabulaire' }, params: { content: [
        { content: drag('Dans 3/4, 3 est le *numérateur* et 4 est le *dénominateur*.') },
      ] } },
      { library: 'H5P.Column 1.16', metadata: { title: 'Exercices' }, params: { content: [
        { content: blanks('1/2 = *2/4*', '3/3 = *1*', '2/8 = *1/4*') },
      ] } },
      { library: 'H5P.Column 1.16', metadata: { title: 'Bilan (vide)' }, params: { content: [] } },
    ],
  }],
}

for (const [name, [mainLibrary, content]] of Object.entries(samples)) {
  const zip = new JSZip()
  zip.file('h5p.json', JSON.stringify({ title: name, language: 'fr', mainLibrary, embedTypes: ['iframe'], preloadedDependencies: [{ machineName: mainLibrary, majorVersion: 1, minorVersion: 0 }] }))
  zip.file('content/content.json', JSON.stringify(content))
  writeFileSync(new URL(`${name}.h5p`, import.meta.url), await zip.generateAsync({ type: 'nodebuffer' }))
}
