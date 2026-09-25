import { useState, useEffect } from 'react'
import { imgSrc, gifSrc, fallbackImgSrc, fallbackGifSrc, exOr } from '../lib/exercises.js'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'

// Big autoplaying animation; tap toggles to the still frame. `compact` shrinks it (superset cards).
// If image fails to load or is missing, shows dumbbell icon as a clean athletic placeholder.
// `minimizable` (workout view) adds a persistent minimize/expand control so the animation stops
// eating the screen; the chosen size is saved to settings and carries across exercises and
// future workouts (issue #12).
export default function Media({ ex, id, compact, minimizable }) {
  const [playing, setPlaying] = useState(true)
  const [err, setErr] = useState(false)
  const [fallback, setFallback] = useState(false)
  const gifSize = useStore(s => s.S.gifSize)
  const update = useStore(s => s.update)

  const resolvedEx = typeof ex === 'string' ? exOr(ex) : (ex || null)

  useEffect(() => {
    setErr(false)
    setFallback(false)
    setPlaying(true)
  }, [resolvedEx?.id, resolvedEx?.img, resolvedEx?.gif])

  if (!resolvedEx) return null

  const mini = minimizable && gifSize === 'mini'
  const toggleSize = e => { e.stopPropagation(); update(s => { s.gifSize = mini ? 'full' : 'mini' }) }

  // If no image or if loading failed, show the dumbbell placeholder
  if ((!resolvedEx.gif && !resolvedEx.img) || err) {
    return (
      <div className={'exmedia exmedia-placeholder' + (compact ? ' compact' : '') + (mini ? ' mini' : '')} id={id}>
        <div className="exmedia-dumbbell">
          <Icon name="dumbbell" />
        </div>
      </div>
    )
  }

  const isGif = playing && resolvedEx.gif
  const src = isGif
    ? (fallback ? fallbackGifSrc(resolvedEx) : gifSrc(resolvedEx))
    : (fallback ? fallbackImgSrc(resolvedEx) : imgSrc(resolvedEx))

  return (
    <div className={'exmedia' + (compact ? ' compact' : '') + (mini ? ' mini' : '')} id={id} onClick={() => setPlaying(p => !p)}>
      <img
        decoding="async"
        src={src}
        alt={resolvedEx.n || ''}
        onError={() => {
          if (isGif && !fallback) {
            setFallback(true)
          } else if (isGif && resolvedEx.img) {
            setPlaying(false)
            setFallback(false)
          } else if (!fallback && resolvedEx.img) {
            setFallback(true)
          } else {
            setErr(true)
          }
        }}
      />
      {minimizable && (
        <button className="giftoggle" onClick={toggleSize}>
          <Icon name={mini ? 'expand' : 'minimize'} />{mini ? t('Expand') : t('Minimize')}
        </button>
      )}
      {!mini && resolvedEx.gif && (
        <span className="gifhint">
          <Icon name={playing ? 'pause' : 'play'} />{playing ? t('tap to pause') : t('tap to play')}
        </span>
      )}
    </div>
  )
}

export function Thumb({ ex }) {
  const [err, setErr] = useState(false)
  const [fallback, setFallback] = useState(false)
  const resolvedEx = typeof ex === 'string' ? exOr(ex) : (ex || null)

  useEffect(() => {
    setErr(false)
    setFallback(false)
  }, [resolvedEx?.id, resolvedEx?.img])

  if (!resolvedEx?.img || err) return <div className="thumb thumb-x"><Icon name="dumbbell" /></div>
  return (
    <img
      className="thumb"
      loading="lazy"
      decoding="async"
      src={fallback ? fallbackImgSrc(resolvedEx) : imgSrc(resolvedEx)}
      alt=""
      onError={() => fallback ? setErr(true) : setFallback(true)}
    />
  )
}
