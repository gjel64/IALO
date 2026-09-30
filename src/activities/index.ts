import type { ActivityType } from './types'
import { multiChoice } from './multichoice'
import { blanks } from './blanks'
import { dragText } from './dragtext'
import { trueFalse } from './truefalse'

// To support a new activity: create a file implementing ActivityType and add it here.
export const activities: ActivityType[] = [multiChoice, trueFalse, blanks, dragText]

export const activityOf = (library = '') => activities.find(a => library.split(' ')[0] === a.machineName)
export const isActivity = (library?: string) => !!activityOf(library)
