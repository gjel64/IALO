import { useRef, useState } from 'react'
import { ActivityCard, AddMenu, fmt, parseTime } from '../components'
import type { Container } from './types'
import { Icon } from '../icons'

export const video: Container = {
  label: 'Vidéo interactive',
  hint: 'Placez la vidéo au bon moment, puis choisissez une activité sous la frise : la vidéo s’y mettra en pause.',
  slots: c => [(c.interactiveVideo.assets ??= {}).interactions ??= []],
  slotName: () => 'Vidéo',
  action: el => el.action,
  posOf: el => el.duration?.from ?? 0,
  slot: () => 0,
  wrap: (action, pos, prev) => {
    const len = prev ? prev.duration.to - prev.duration.from : 10
    return { x: 5, y: 5, width: 40, height: 20, pause: true, displayType: 'poster', label: '', ...prev, action, duration: { from: pos, to: pos + len } }
  },

  View: ({ content, items, files, ctl, preview }) => {
    const path: string = content.interactiveVideo.video?.files?.[0]?.path ?? ''
    const src = /youtu/.test(path) ? undefined : files[path] ?? path
    const ref = useRef<HTMLVideoElement>(null)
    const [time, setTime] = useState(0)
    const [length, setLength] = useState(0)
    const duration = Math.max(length, 60, ...items.map(i => i.pos + 20))
    const current = items.find(i => i.id === ctl.selected)

    const seek = (t: number) => { setTime(t); if (ref.current) ref.current.currentTime = t }
    const at = (e: React.PointerEvent, el: Element) => {
      const r = el.getBoundingClientRect()
      return Math.round(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * duration)
    }
    // Pause when playback reaches an activity, like the student would experience it.
    const onTime = (t: number) => {
      const hit = items.find(i => i.pos > time && i.pos <= t)
      if (hit) { ref.current!.pause(); ctl.select(hit.id) }
      setTime(t)
    }

    return (
      <div className="video">
        <div className="screen">
          {src
            ? <video ref={ref} src={src} controls={!current} onTimeUpdate={e => onTime(e.currentTarget.currentTime)} onLoadedMetadata={e => setLength(e.currentTarget.duration)} />
            : <div className="placeholder"><Icon name="play" size={32} />{path ? 'Vidéo YouTube' : 'Vidéo'}<small>{path}</small></div>}
          {current && (
            <div className="overlay" onClick={() => ctl.select()}>
              <div onClick={e => e.stopPropagation()}>
                <ActivityCard item={current} ctl={ctl} preview={preview} tools={
                  <label>à <input key={current.pos} className="time" defaultValue={fmt(current.pos)} onBlur={e => ctl.update(current.id, { pos: parseTime(e.target.value) || 0 })} /></label>
                } />
                <button className={preview ? 'primary' : 'link'} onClick={() => { ctl.select(); ref.current?.play() }}><Icon name="play" size={14} /> Continuer la vidéo</button>
              </div>
            </div>
          )}
        </div>
        <div className="timeline" onPointerDown={e => { ctl.select(); seek(at(e, e.currentTarget)) }}>
          <div className="progress" style={{ width: `${(time / duration) * 100}%` }} />
          {items.map(it => (
            <button
              key={it.id}
              className={it.id === ctl.selected ? 'marker on' : 'marker'}
              style={{ left: `${(it.pos / duration) * 100}%` }}
              title={preview ? `Activité à ${fmt(it.pos)}` : `${fmt(it.pos)} — glisser pour déplacer`}
              onPointerDown={e => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); ctl.select(it.id); seek(it.pos) }}
              onPointerMove={e => { if (!preview && e.currentTarget.hasPointerCapture(e.pointerId)) { const t = at(e, e.currentTarget.parentElement!); ctl.update(it.id, { pos: t }); seek(t) } }}
            >{fmt(it.pos)}</button>
          ))}
        </div>
        {!preview && <AddMenu label={`Ajouter à ${fmt(time)}`} onAdd={t => ctl.add(t, Math.round(time))} />}
      </div>
    )
  },
}
