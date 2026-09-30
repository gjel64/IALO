import JSZip from 'jszip'
import { load, type H5PPackage } from '../h5p/package'
import { pages, type Block, type Box, type Picture, type Progress, type Source } from './sources'

export type Format = 'video' | 'slides' | 'book'

const MAIN: Record<Format, string> = { video: 'H5P.InteractiveVideo', slides: 'H5P.CoursePresentation', book: 'H5P.InteractiveBook' }

// Library versions written in new files (current H5P Hub releases, matching the activities' versions).
const LIBS: Record<string, string> = {
  'H5P.InteractiveVideo': '1.28', 'H5P.CoursePresentation': '1.27', 'H5P.InteractiveBook': '1.15',
  'H5P.Column': '1.22', 'H5P.AdvancedText': '1.1', 'H5P.Image': '1.1',
}

// Largest area of the 16:9 slide showing the whole picture.
const fit = ({ width, height }: Picture): Box => {
  const r = width / height / (16 / 9)
  return r > 1 ? { x: 0, y: (100 - 100 / r) / 2, width: 100, height: 100 / r } : { x: (100 - 100 * r) / 2, y: 0, width: 100 * r, height: 100 }
}

// Builds a new .h5p from the sources, ready to receive activities in the editor.
export async function build(format: Format, title: string, sources: Source[], progress: Progress): Promise<{ pkg: H5PPackage; warnings: string[] }> {
  const zip = new JSZip()
  const used = new Set([MAIN[format]])
  let n = 0
  const file = (blob: Blob, path: string) => { zip.file(`content/${path}`, blob); return path }
  const sub = (machineName: string, params: any, contentType: string) => {
    used.add(machineName)
    return { library: `${machineName} ${LIBS[machineName]}`, params, subContentId: crypto.randomUUID(), metadata: { contentType, license: 'U', title: contentType } }
  }
  const action = (b: Block) => {
    if ('html' in b) return sub('H5P.AdvancedText', { text: b.html }, 'Text')
    const { blob, width, height } = b.picture
    const path = file(blob, `images/${++n}.${blob.type.split('/')[1].replace('jpeg', 'jpg')}`)
    return sub('H5P.Image', { contentName: 'Image', alt: b.alt, decorative: !b.alt, file: { path, mime: blob.type, width, height, copyright: { license: 'U' } } }, 'Image')
  }

  let content: any
  let warnings: string[] = []
  if (format === 'video') {
    const s = sources[0]
    const video = s.file
      ? { path: file(s.file, `videos/${s.file.name.replace(/[^\w.-]+/g, '_')}`), mime: s.file.type || 'video/mp4' }
      : { path: s.url!, mime: s.kind === 'youtube' ? 'video/YouTube' : 'video/mp4' }
    content = {
      interactiveVideo: {
        video: { startScreenOptions: { title, hideStartTitle: false }, textTracks: { videoTrack: [] }, files: [{ ...video, copyright: { license: 'U' } }] },
        assets: { interactions: [], bookmarks: [], endscreens: [] },
      },
    }
  } else {
    const got = await pages(sources, progress)
    warnings = got.warnings
    progress('Assemblage du fichier…')
    content = format === 'slides'
      ? {
          presentation: {
            keywordListEnabled: true,
            slides: got.pages.map(p => ({
              keywords: [{ main: p.title }],
              slideBackgroundSelector: {},
              elements: p.blocks.map(b => ({ ...(b.box ?? ('picture' in b ? fit(b.picture) : { x: 5, y: 5, width: 90, height: 90 })), action: action(b) })),
            })),
          },
        }
      : {
          showCoverPage: false,
          behaviour: { defaultTableOfContents: true, progressIndicators: true, progressAuto: true, displaySummary: true, enableRetry: true },
          // The slide title is already the chapter title.
          chapters: got.pages.map(p => ({
            ...sub('H5P.Column', { content: p.blocks.filter(b => !b.title).map(b => ({ content: action(b), useSeparator: 'auto' })) }, 'Column'),
            metadata: { contentType: 'Column', license: 'U', title: p.title },
          })),
        }
  }

  const preloadedDependencies = [...used].map(machineName => {
    const [majorVersion, minorVersion] = LIBS[machineName].split('.').map(Number)
    return { machineName, majorVersion, minorVersion }
  })
  zip.file('h5p.json', JSON.stringify({ title, language: 'fr', mainLibrary: MAIN[format], embedTypes: ['iframe'], license: 'U', preloadedDependencies }))
  zip.file('content/content.json', JSON.stringify(content))
  return { pkg: await load(await zip.generateAsync({ type: 'blob' })), warnings }
}
