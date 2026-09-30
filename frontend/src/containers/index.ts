import type { Container } from './types'
import { video } from './video'
import { slides } from './slides'
import { book } from './book'

// To support a new container: implement Container in its own file and add it here.
export const containers: Record<string, Container> = {
  'H5P.InteractiveVideo': video,
  'H5P.CoursePresentation': slides,
  'H5P.InteractiveBook': book,
}
