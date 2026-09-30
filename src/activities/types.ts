import type { FC } from 'react'
import type { IconName } from '../icons'

export interface ActivityType<P = any> {
  machineName: string // e.g. "H5P.MultiChoice"
  version: string // used when the .h5p doesn't bundle the library
  label: string
  icon: IconName
  create(): P
  Edit: FC<{ p: P; set: (p: P) => void }> // student view, editable in place
  Play: FC<{ p: P }> // student view, answerable, for the preview
}
