import JSZip from 'jszip'
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker'

// Teaching material a teacher starts from (video, PowerPoint, PDF, images), turned into pages of text and pictures.

export type Kind = 'video' | 'youtube' | 'pdf' | 'pptx' | 'image'
export interface Source { id: string; kind: Kind; name: string; file?: File; url?: string; alt: string }

export interface Box { x: number; y: number; width: number; height: number } // % of a 16:9 slide
export interface Picture { blob: Blob; width: number; height: number }
export type Block = { box?: Box; title?: boolean } & ({ html: string } | { picture: Picture; alt: string })
export interface Page { title: string; blocks: Block[] }
export type Progress = (message: string) => void

const KINDS: Record<string, Kind> = {
  mp4: 'video', webm: 'video', ogv: 'video', m4v: 'video', pdf: 'pdf', pptx: 'pptx',
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image', svg: 'image',
}
const MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp' }

export const ACCEPT = Object.keys(KINDS).map(e => `.${e}`).join(',')
const ext = (name: string) => name.split('.').pop()!.toLowerCase()
export const baseName = (name: string) => name.replace(/\.[^.]+$/, '')
export const kindOf = (name: string): Kind | undefined => KINDS[ext(name)]
export const isYouTube = (url: string) => /^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//.test(url)
export const isVideo = (s: Source) => s.kind === 'video' || s.kind === 'youtube'

export async function pages(sources: Source[], progress: Progress): Promise<{ pages: Page[]; warnings: string[] }> {
  const warnings: string[] = []
  const out: Page[] = []
  for (const s of sources) {
    progress(`Lecture de « ${s.name} »…`)
    const got = s.kind === 'pdf' ? await pdf(s.file!, progress) : s.kind === 'pptx' ? await pptx(s.file!, progress, warnings) : await image(s, warnings)
    // "Page 3" is ambiguous when several documents are merged.
    out.push(...got.map(p => (sources.length > 1 && got.length > 1 ? { ...p, title: `${baseName(s.name)} – ${p.title}` } : p)))
  }
  return { pages: out, warnings }
}

const canvasBlob = (c: HTMLCanvasElement, type: string) =>
  new Promise<Blob>((ok, ko) => c.toBlob(b => (b ? ok(b) : ko(new Error('image vide'))), type, 0.85))

// Browsers display more formats than H5P accepts: keep PNG/JPEG/GIF, convert the rest to PNG.
async function picture(blob: Blob): Promise<Picture | undefined> {
  const url = URL.createObjectURL(blob)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const width = img.naturalWidth || 1200, height = img.naturalHeight || 900
    if (['image/png', 'image/jpeg', 'image/gif'].includes(blob.type)) return { blob, width, height }
    const canvas = Object.assign(document.createElement('canvas'), { width, height })
    canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
    return { blob: await canvasBlob(canvas, 'image/png'), width, height }
  } catch {
    return undefined
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function image(s: Source, warnings: string[]): Promise<Page[]> {
  const pic = await picture(s.file!)
  if (!pic) { warnings.push(`« ${s.name} » n'a pas pu être lue.`); return [] }
  return [{ title: baseName(s.name), blocks: [{ picture: pic, alt: s.alt }] }]
}

// One picture per page; the page text becomes its alternative text for screen readers.
async function pdf(file: File, progress: Progress): Promise<Page[]> {
  const pdfjs = await import('pdfjs-dist')
  // Worker bundled by Vite: no URL to fetch at runtime, so it works the same in dev and in production.
  pdfjs.GlobalWorkerOptions.workerPort ??= new PdfWorker()
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const out: Page[] = []
  for (let n = 1; n <= doc.numPages; n++) {
    progress(`« ${file.name} » : page ${n} sur ${doc.numPages}`)
    const page = await doc.getPage(n)
    const viewport = page.getViewport({ scale: Math.min(2, 1600 / page.getViewport({ scale: 1 }).width) })
    const canvas = Object.assign(document.createElement('canvas'), { width: Math.ceil(viewport.width), height: Math.ceil(viewport.height) })
    await page.render({ canvas, viewport }).promise
    const text = (await page.getTextContent()).items
      .map(t => ('str' in t ? t.str + (t.hasEOL ? '\n' : '') : ''))
      .join('').replace(/[ \t]+/g, ' ').trim()
    out.push({ title: `Page ${n}`, blocks: [{ picture: { blob: await canvasBlob(canvas, 'image/jpeg'), width: canvas.width, height: canvas.height }, alt: text || `Page ${n}` }] })
    page.cleanup()
  }
  await doc.destroy()
  return out
}

// PowerPoint: text boxes and pictures of each slide, at their place. Tables, charts and SmartArt are not imported.
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const parse = (s: string) => new DOMParser().parseFromString(s, 'application/xml')
const child = (el: Element | undefined, name: string) => (el ? [...el.children].find(c => c.localName === name) : undefined)
const find = (el: Element | Document | undefined, name: string) => el?.getElementsByTagNameNS('*', name)[0]
const num = (el: Element | undefined, attr: string) => Number(el?.getAttribute(attr) ?? 0)
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')

type Rect = number[] // x, y, width, height in EMU
const xfrm = (spPr?: Element): Rect | undefined => {
  const x = child(spPr, 'xfrm'), off = child(x, 'off'), ext = child(x, 'ext')
  return off && ext ? [num(off, 'x'), num(off, 'y'), num(ext, 'cx'), num(ext, 'cy')] : undefined
}

// Placeholders: "obj" and untyped ones are body text; date, footer and slide number are skipped.
const phOf = (sp: Element) => find(child(sp, 'nvSpPr'), 'ph')
const phType = (ph: Element) => { const t = ph.getAttribute('type') ?? 'body'; return t === 'ctrTitle' ? 'title' : t === 'obj' ? 'body' : t }
const SKIPPED = ['dt', 'ftr', 'sldNum', 'hdr']
const DEFAULT_BOX: Record<string, Box> = { title: { x: 5, y: 5, width: 90, height: 15 }, body: { x: 5, y: 22, width: 90, height: 72 } }

function text(txBody: Element, type?: string) {
  const paras = [...txBody.children].filter(p => p.localName === 'p').map(p => ({
    text: [...p.children].map(c => (c.localName === 'br' ? '\n' : c.localName === 'r' || c.localName === 'fld' ? find(c, 't')?.textContent ?? '' : '')).join('').trim(),
    bullet: !find(p, 'buNone') && (!!find(p, 'buChar') || !!find(p, 'buAutoNum') || type === 'body'),
  })).filter(p => p.text)
  const plain = paras.map(p => p.text).join('\n')
  if (type === 'title') return { plain, html: plain && `<h2>${esc(plain)}</h2>` }
  let html = '', list = ''
  for (const p of paras) {
    if (p.bullet) { list += `<li>${esc(p.text)}</li>`; continue }
    if (list) { html += `<ul>${list}</ul>`; list = '' }
    html += `<p>${esc(p.text)}</p>`
  }
  return { plain, html: list ? `${html}<ul>${list}</ul>` : html }
}

async function pptx(file: File, progress: Progress, warnings: string[]): Promise<Page[]> {
  const zip = await JSZip.loadAsync(file)
  const docs = new Map<string, Promise<Document>>()
  const read = (path: string) => {
    if (!docs.has(path)) docs.set(path, zip.file(path)!.async('string').then(parse))
    return docs.get(path)!
  }
  // Relationships of a part: id -> path of the target in the archive.
  const rels = async (path: string) => {
    const f = zip.file(path.replace(/[^/]+$/, n => `_rels/${n}.rels`))
    const doc = f ? parse(await f.async('string')) : undefined
    return new Map([...(doc?.getElementsByTagNameNS('*', 'Relationship') ?? [])].map(r =>
      [r.getAttribute('Id')!, decodeURIComponent(new URL(r.getAttribute('Target')!, `http://x/${path}`).pathname.slice(1))]))
  }

  const pres = await read('ppt/presentation.xml')
  const presRels = await rels('ppt/presentation.xml')
  const size = find(pres, 'sldSz')
  const W = num(size, 'cx') || 12192000, H = num(size, 'cy') || 6858000
  // Letterbox the original slide (often 4:3) into a 16:9 one.
  const ratio = W / H / (16 / 9), cw = ratio < 1 ? 100 * ratio : 100, ch = ratio < 1 ? 100 : 100 / ratio
  const toBox = ([x, y, w, h]: Rect): Box => ({ x: (100 - cw) / 2 + (x / W) * cw, y: (100 - ch) / 2 + (y / H) * ch, width: (w / W) * cw, height: (h / H) * ch })

  const ids = [...pres.getElementsByTagNameNS('*', 'sldId')].map(s => s.getAttributeNS(R, 'id')!)
  const out: Page[] = []
  let lostPictures = 0, lostFrames = 0
  for (const [n, id] of ids.entries()) {
    progress(`« ${file.name} » : diapo ${n + 1} sur ${ids.length}`)
    const path = presRels.get(id)!
    const slideRels = await rels(path)
    const layout = [...slideRels.values()].find(t => t.includes('/slideLayouts/'))
    const master = layout && [...(await rels(layout)).values()].find(t => t.includes('/slideMasters/'))
    const inheritFrom = await Promise.all([layout, master].filter(p => p && zip.file(p)).map(p => read(p!)))
    // A placeholder without position takes the one of the layout, else of the master.
    const inherited = (ph: Element) => {
      for (const doc of inheritFrom) {
        const sps = [...doc.getElementsByTagNameNS('*', 'sp')].filter(phOf)
        const idx = ph.getAttribute('idx')
        const hit = sps.find(sp => idx && phOf(sp)!.getAttribute('idx') === idx) ?? sps.find(sp => phType(phOf(sp)!) === phType(ph))
        const rect = hit && xfrm(child(hit, 'spPr'))
        if (rect) return rect
      }
    }

    let title = ''
    const blocks: Block[] = []
    const walk = async (tree: Element, map: (r: Rect) => Rect) => {
      for (const el of [...tree.children]) {
        if (el.localName === 'grpSp') {
          const spPr = child(el, 'grpSpPr'), g = child(spPr, 'xfrm')
          const [ox, oy, ow, oh] = xfrm(spPr) ?? [0, 0, 1, 1]
          const off = child(g, 'chOff'), ext = child(g, 'chExt')
          const sx = ow / (num(ext, 'cx') || ow || 1), sy = oh / (num(ext, 'cy') || oh || 1)
          await walk(el, ([x, y, w, h]) => map([ox + (x - num(off, 'x')) * sx, oy + (y - num(off, 'y')) * sy, w * sx, h * sy]))
        } else if (el.localName === 'sp') {
          const ph = phOf(el), type = ph && phType(ph)
          const txBody = child(el, 'txBody')
          if (!txBody || (type && SKIPPED.includes(type))) continue
          const t = text(txBody, type)
          if (!t.html) continue
          if (type === 'title' && !title) title = t.plain
          const own = xfrm(child(el, 'spPr')), inh = ph && inherited(ph)
          blocks.push({ html: t.html, title: type === 'title', box: own ? toBox(map(own)) : inh ? toBox(inh) : DEFAULT_BOX[type === 'title' ? 'title' : 'body'] })
        } else if (el.localName === 'pic') {
          const target = slideRels.get(find(el, 'blip')?.getAttributeNS(R, 'embed') ?? '')
          const f = target ? zip.file(target) : null
          const pic = f && await picture(new Blob([await f.async('arraybuffer')], { type: MIME[ext(target!)] ?? '' }))
          if (!pic) { lostPictures++; continue }
          const rect = xfrm(child(el, 'spPr'))
          blocks.push({ picture: pic, alt: find(el, 'cNvPr')?.getAttribute('descr') ?? '', box: rect && toBox(map(rect)) })
        } else if (el.localName === 'graphicFrame') lostFrames++
      }
    }
    await walk(find(await read(path), 'spTree')!, r => r)
    out.push({ title: title || `Diapo ${n + 1}`, blocks })
  }
  if (lostPictures) warnings.push(`« ${file.name} » : ${lostPictures} image(s) dans un format non pris en charge n'ont pas été importées.`)
  if (lostFrames) warnings.push(`« ${file.name} » : ${lostFrames} tableau(x), graphique(s) ou SmartArt n'ont pas été importés.`)
  return out
}
