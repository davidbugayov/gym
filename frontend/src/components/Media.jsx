import { useState, useEffect } from 'react'
import { imgSrc, gifSrc, fallbackImgSrc, fallbackGifSrc, exOr } from '../lib/exercises.js'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'

/**
 * High-performance athletic Media component.
 * Displays exercise animation/image with seamless fallbacks.
 * When media is missing, loading, or fails to load, gracefully displays an
 * athletic dumbbell placeholder with glowing accent border, matching the list view style.
 */
export default function Media({ ex, id, compact, minimizable }) {
  const [playing, setPlaying] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [candidateIdx, setCandidateIdx] = useState(0)
  const [hasError, setHasError] = useState(false)
  const gifSize = useStore(s => s.S.gifSize)
  const update = useStore(s => s.update)

  const resolvedEx = typeof ex === 'string' ? exOr(ex) : (ex || null)

  // Assemble candidate URLs in prioritized order:
  // 1. Local GIF, 2. CDN GIF, 3. Local IMG, 4. CDN IMG
  const candidates = []
  if (resolvedEx?.gif) {
    const gLocal = gifSrc(resolvedEx)
    const gCdn = fallbackGifSrc(resolvedEx)
    if (gLocal) candidates.push({ url: gLocal, isGif: true })
    if (gCdn && gCdn !== gLocal) candidates.push({ url: gCdn, isGif: true })
  }
  if (resolvedEx?.img) {
    const iLocal = imgSrc(resolvedEx)
    const iCdn = fallbackImgSrc(resolvedEx)
    if (iLocal) candidates.push({ url: iLocal, isGif: false })
    if (iCdn && iCdn !== iLocal) candidates.push({ url: iCdn, isGif: false })
  }

  useEffect(() => {
    setCandidateIdx(0)
    setLoaded(false)
    setHasError(false)
    setPlaying(true)
  }, [resolvedEx?.id, resolvedEx?.img, resolvedEx?.gif])

  if (!resolvedEx) return null

  const mini = minimizable && gifSize === 'mini'
  const toggleSize = e => {
    e.stopPropagation()
    update(s => { s.gifSize = mini ? 'full' : 'mini' })
  }

  const currentCandidate = candidates[candidateIdx] || null
  const isFailed = hasError || !currentCandidate || candidates.length === 0

  const handleNextCandidate = () => {
    if (candidateIdx < candidates.length - 1) {
      setCandidateIdx(i => i + 1)
      setLoaded(false)
    } else {
      setHasError(true)
      setLoaded(false)
    }
  }

  // Keep the still frame visible while the larger animation downloads.
  const renderPlaceholder = () => (
    <div className={'exmedia-placeholder' + (compact ? ' compact' : '') + (mini ? ' mini' : '')}>
      {currentCandidate?.isGif && resolvedEx.img
        ? <StillPreview ex={resolvedEx} />
        : <div className="exmedia-dumbbell-box"><Icon name="dumbbell" /></div>}
      {!compact && !mini && (
        <span className="exmedia-placeholder-label">
          {resolvedEx.n || t('Exercise')}
        </span>
      )}
    </div>
  )

  if (isFailed) {
    return (
      <div
        className={'exmedia standalone-placeholder' + (compact ? ' compact' : '') + (mini ? ' mini' : '')}
        id={id}
      >
        {renderPlaceholder()}
      </div>
    )
  }

  const currentSrc = currentCandidate.url

  return (
    <div
      className={'exmedia' + (compact ? ' compact' : '') + (mini ? ' mini' : '') + (loaded ? ' is-loaded' : '')}
      id={id}
      onClick={() => {
        if (loaded && currentCandidate.isGif) {
          setPlaying(p => !p)
        }
      }}
    >
      {/* While image is loading or before loaded, show placeholder with dumbbell */}
      {!loaded && renderPlaceholder()}
      {loaded && !playing && currentCandidate.isGif && resolvedEx.img && (
        <div className="exmedia-placeholder exmedia-paused"><StillPreview ex={resolvedEx} /></div>
      )}

      <img
        key={currentSrc}
        decoding="async"
        src={currentSrc}
        alt=""
        style={{
          display: loaded && playing ? 'block' : 'none',
          opacity: loaded ? 1 : 0
        }}
        onLoad={e => {
          if (e.target.naturalWidth > 0) {
            setLoaded(true)
            setHasError(false)
          } else {
            handleNextCandidate()
          }
        }}
        onError={handleNextCandidate}
      />

      {minimizable && (
        <button className="giftoggle" onClick={toggleSize}>
          <Icon name={mini ? 'expand' : 'minimize'} />
          {mini ? t('Expand') : t('Minimize')}
        </button>
      )}

      {loaded && !mini && currentCandidate.isGif && (
        <span className="gifhint">
          <Icon name={playing ? 'pause' : 'play'} />
          {playing ? t('tap to pause') : t('tap to play')}
        </span>
      )}
    </div>
  )
}

function StillPreview({ ex }) {
  const [fallback, setFallback] = useState(false)
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setFallback(false)
    setFailed(false)
    setLoaded(false)
  }, [ex.id, ex.img])

  return <>
    {!loaded && <div className="exmedia-dumbbell-box"><Icon name="dumbbell" /></div>}
    {!failed && <img
      className="exmedia-still"
      src={fallback ? fallbackImgSrc(ex) : imgSrc(ex)}
      alt=""
      style={{ display: loaded ? 'block' : 'none' }}
      onLoad={() => setLoaded(true)}
      onError={() => fallback ? setFailed(true) : (setLoaded(false), setFallback(true))}
    />}
  </>
}

export function Thumb({ ex }) {
  const [err, setErr] = useState(false)
  const [fallback, setFallback] = useState(false)
  const resolvedEx = typeof ex === 'string' ? exOr(ex) : (ex || null)

  useEffect(() => {
    setErr(false)
    setFallback(false)
  }, [resolvedEx?.id, resolvedEx?.img])

  if (!resolvedEx?.img || err) {
    return (
      <div className="thumb thumb-x" title={resolvedEx?.n || ''}>
        <Icon name="dumbbell" />
      </div>
    )
  }

  return (
    <img
      className="thumb"
      loading="lazy"
      decoding="async"
      src={fallback ? fallbackImgSrc(resolvedEx) : imgSrc(resolvedEx)}
      alt=""
      onError={() => {
        if (!fallback) {
          setFallback(true)
        } else {
          setErr(true)
        }
      }}
    />
  )
}
