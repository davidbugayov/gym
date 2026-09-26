import { useState, useRef, useEffect } from 'react'
import Icon from './Icon.jsx'
import { confirmSheet } from '../sheets.jsx'
import { vibrate } from '../lib/sound.js'
import { t } from '../lib/i18n.js'

/**
 * Mobile-friendly swipe-to-delete component.
 * Supports touch and pointer dragging to reveal a sleek delete action,
 * full-swipe trigger, snap-open drawer, haptic feedback, and confirmation dialog.
 */
export default function SwipeToDelete({
  children,
  onDelete,
  confirm = true,
  confirmTitle,
  confirmMessage,
  confirmText,
  actionWidth = 84,
  disabled = false,
  label,
  icon = 'trash',
  className = '',
  style = {}
}) {
  const [offset, setOffset] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const containerRef = useRef(null)
  const touchStartRef = useRef({ x: 0, y: 0 })
  const startOffsetRef = useRef(0)
  const lockRef = useRef(null) // 'h' | 'v' | null
  const startTimeRef = useRef(0)
  const didSwipeRef = useRef(false)
  const hasHapticRef = useRef(false)
  const activePointerIdRef = useRef(null)

  // Auto-close when clicking or tapping outside
  useEffect(() => {
    if (!isOpen) return
    const handleOutside = e => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
        setOffset(0)
      }
    }
    document.addEventListener('pointerdown', handleOutside, { capture: true })
    return () => document.removeEventListener('pointerdown', handleOutside, { capture: true })
  }, [isOpen])

  const triggerDelete = () => {
    if (confirm) {
      confirmSheet({
        title: confirmTitle || t('Delete workout?'),
        message: confirmMessage || t('This removes it from your history for good.'),
        confirmText: confirmText || t('Delete'),
        danger: true,
        onConfirm: () => {
          setIsDeleting(true)
          setOffset(-320)
          setTimeout(() => {
            onDelete?.()
          }, 240)
        },
        onCancel: () => {
          setOffset(0)
          setIsOpen(false)
        }
      })
    } else {
      setIsDeleting(true)
      setOffset(-320)
      setTimeout(() => {
        onDelete?.()
      }, 240)
    }
  }

  // Touch & Pointer Gesture Handlers
  const handlePointerDown = e => {
    if (disabled || isDeleting) return
    // Only primary button
    if (e.button !== undefined && e.button !== 0) return

    activePointerIdRef.current = e.pointerId ?? null
    touchStartRef.current = { x: e.clientX, y: e.clientY }
    startOffsetRef.current = isOpen ? -actionWidth : 0
    lockRef.current = null
    startTimeRef.current = Date.now()
    didSwipeRef.current = false
    hasHapticRef.current = false
  }

  const handlePointerMove = e => {
    if (disabled || isDeleting) return
    if (activePointerIdRef.current !== null && e.pointerId !== undefined && e.pointerId !== activePointerIdRef.current) return
    if (!startTimeRef.current) return

    const cx = e.clientX
    const cy = e.clientY
    const dx = cx - touchStartRef.current.x
    const dy = cy - touchStartRef.current.y

    // Determine gesture direction
    if (lockRef.current === null) {
      if (Math.hypot(dx, dy) > 8) {
        if (Math.abs(dy) > Math.abs(dx)) {
          lockRef.current = 'v'
          return
        } else {
          lockRef.current = 'h'
          setIsDragging(true)
        }
      } else {
        return
      }
    }

    if (lockRef.current === 'v') return

    // Horizontal drag locked
    didSwipeRef.current = true

    const rawOffset = startOffsetRef.current + dx
    let newOffset = rawOffset

    if (rawOffset > 0) {
      // Rubber band resistance when pulling right
      newOffset = rawOffset * 0.15
    } else if (rawOffset < -actionWidth) {
      // Pulling beyond action button (towards full-swipe delete)
      const extra = rawOffset + actionWidth
      newOffset = -actionWidth + extra * 0.85

      // Trigger haptic feedback when crossing full swipe threshold
      if (newOffset < -160 && !hasHapticRef.current) {
        hasHapticRef.current = true
        vibrate(30)
      } else if (newOffset >= -160) {
        hasHapticRef.current = false
      }
    }

    setOffset(newOffset)
  }

  const handlePointerUp = e => {
    if (!startTimeRef.current) return
    activePointerIdRef.current = null
    startTimeRef.current = 0
    setIsDragging(false)

    if (lockRef.current === 'h') {
      const elapsed = Date.now() - startTimeRef.current
      const width = containerRef.current?.offsetWidth || 300
      const fullThreshold = Math.min(180, width * 0.48)

      // 1. Full-swipe delete
      if (offset < -fullThreshold) {
        vibrate([20, 40])
        triggerDelete()
        setTimeout(() => { didSwipeRef.current = false }, 200)
        return
      }

      // 2. Snap open or closed
      const snapThreshold = actionWidth * 0.45
      if (offset < -snapThreshold) {
        setOffset(-actionWidth)
        setIsOpen(true)
        vibrate(20)
      } else {
        setOffset(0)
        setIsOpen(false)
      }

      setTimeout(() => {
        didSwipeRef.current = false
      }, 150)
    }

    lockRef.current = null
  }

  const handleClickCapture = e => {
    if (didSwipeRef.current) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    if (isOpen) {
      e.preventDefault()
      e.stopPropagation()
      setOffset(0)
      setIsOpen(false)
    }
  }

  // Calculate background reveal width and scale
  const revealWidth = Math.max(0, -offset)
  const isFullSwipePrimed = offset < -160

  return (
    <div
      ref={containerRef}
      className={`swipe-delete-wrapper ${isDeleting ? 'is-deleting' : ''} ${className}`}
      style={{
        ...style,
        ...(isDeleting
          ? {
              maxHeight: 0,
              opacity: 0,
              margin: 0,
              padding: 0,
              pointerEvents: 'none'
            }
          : {})
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClickCapture={handleClickCapture}
    >
      {/* Background Delete Action Layer */}
      <div
        className={`swipe-delete-action-bg ${isFullSwipePrimed ? 'primed' : ''}`}
        style={{
          width: `${revealWidth}px`,
          opacity: revealWidth > 4 ? 1 : 0
        }}
      >
        <button
          type="button"
          className="swipe-delete-btn"
          style={{ width: `${Math.max(actionWidth, revealWidth)}px` }}
          onClick={e => {
            e.stopPropagation()
            triggerDelete()
          }}
          title={label || t('Delete')}
          aria-label={label || t('Delete')}
        >
          <Icon
            name={icon}
            style={{
              fontSize: isFullSwipePrimed ? 24 : 20,
              transform: isFullSwipePrimed ? 'scale(1.15)' : 'none',
              transition: 'transform 0.15s ease, font-size 0.15s ease'
            }}
          />
          <span style={{ fontSize: 11 }}>{label || t('Delete')}</span>
        </button>
      </div>

      {/* Foreground Swipeable Content */}
      <div
        className="swipe-delete-content"
        style={{
          transform: `translate3d(${offset}px, 0, 0)`,
          transition: isDragging ? 'none' : 'transform 0.26s cubic-bezier(0.2, 0.9, 0.3, 1)'
        }}
      >
        {children}
      </div>
    </div>
  )
}
