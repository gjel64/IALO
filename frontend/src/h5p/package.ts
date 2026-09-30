import JSZip from 'jszip'

export interface H5PPackage {
  zip: JSZip
  meta: any // h5p.json
  content: any // content/content.json
  versions: Record<string, string> // machineName -> "1.16" (libraries bundled in the file)
  files: Record<string, string> // content-relative path -> blob URL (images, videos…)
}

export async function load(file: Blob): Promise<H5PPackage> {
  const zip = await JSZip.loadAsync(file)
  const json = async (path: string) => JSON.parse(await zip.file(path)!.async('string'))
  const versions: Record<string, string> = {}
  const files: Record<string, string> = {}
  await Promise.all(Object.values(zip.files).map(async f => {
    const lib = f.name.match(/^(H5P\.\w+)-(\d+\.\d+)\/library\.json$/)
    if (lib) versions[lib[1]] = lib[2]
    else if (f.name.startsWith('content/') && !f.dir && !f.name.endsWith('.json'))
      files[f.name.slice(8)] = URL.createObjectURL(await f.async('blob'))
  }))
  return { zip, meta: await json('h5p.json'), content: await json('content/content.json'), versions, files }
}

export async function save(pkg: H5PPackage, content: any, usedLibraries: string[]): Promise<Blob> {
  const deps: any[] = pkg.meta.preloadedDependencies ?? []
  for (const lib of usedLibraries) {
    const [machineName, v] = lib.split(' ')
    const [majorVersion, minorVersion] = v.split('.').map(Number)
    if (!deps.some(d => d.machineName === machineName)) deps.push({ machineName, majorVersion, minorVersion })
  }
  pkg.zip.file('h5p.json', JSON.stringify({ ...pkg.meta, preloadedDependencies: deps }))
  pkg.zip.file('content/content.json', JSON.stringify(content))
  return pkg.zip.generateAsync({ type: 'blob', mimeType: 'application/zip' })
}
