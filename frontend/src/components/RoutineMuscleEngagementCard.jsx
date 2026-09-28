import { useState, useMemo } from 'react'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { MUSCLE_NAME, MUSCLES } from '../lib/muscles.js'
import {
  analyzeRoutineMuscleEngagement,
  MUSCLE_CATEGORIES,
  MUSCLE_TO_CATEGORY,
  getRecommendedExercisesForMuscle
} from '../lib/muscle-gaps.js'
import BodyMap, { BodyMapLegend } from './BodyMap.jsx'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'
import { Thumb } from './Media.jsx'
import { exerciseDetailSheet, addToRoutineSheet } from '../sheets.jsx'
import { glyphOf } from '../lib/glyphs.js'
import { effectiveRoutine } from '../lib/history.js'
import { todayISO } from '../lib/format.js'

/**
 * RoutineMuscleEngagementCard
 *
 * Visualizes comprehensive muscle engagement for the current routine,
 * highlights movement pattern balance (Push / Pull / Legs / Core),
 * and surfaces actionable training gaps with recommended exercises.
 */
export default function RoutineMuscleEngagementCard({
  routine: propRoutine,
  onSelectRoutine,
  onAddExercise,
  editable = false,
  showRoutineSelector = true,
  title,
  className = ''
}) {
  const S = useStore(s => s.S)
  const storeRoutines = Array.isArray(S?.routines) ? S.routines : []

  // Resolve active routine: prop -> today's scheduled routine -> first available routine
  const [internalRoutineId, setInternalRoutineId] = useState(null)

  const activeRoutine = useMemo(() => {
    if (propRoutine) return propRoutine
    if (internalRoutineId) {
      const found = storeRoutines.find(r => r.id === internalRoutineId)
      if (found) return found
    }
    const todayEff = effectiveRoutine(S, todayISO())
    if (todayEff) return todayEff
    return storeRoutines[0] || null
  }, [propRoutine, internalRoutineId, storeRoutines, S])

  // Silhouette gender (defaults to user's body profile setting)
  const [bodySilhouette, setBodySilhouette] = useState(S?.body === 'female' ? 'female' : 'male')

  // Selected muscle for deep-dive inspection
  const [selectedMuscle, setSelectedMuscle] = useState(null)

  // Active view tab: 'gaps' (Opportunities & Gaps), 'map' (Interactive Body Map), 'list' (All Muscles List)
  const [activeTab, setActiveTab] = useState('gaps')

  // Category filter for the muscle breakdown list
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Comprehensive analysis of the active routine
  const analysis = useMemo(() => {
    return analyzeRoutineMuscleEngagement(activeRoutine)
  }, [activeRoutine])

  const handleRoutineChange = e => {
    const nextId = e.target.value
    setInternalRoutineId(nextId)
    setSelectedMuscle(null)
    if (onSelectRoutine) {
      const r = storeRoutines.find(item => item.id === nextId)
      onSelectRoutine(r)
    }
  }

  // Selected muscle detail data
  const selectedMuscleData = useMemo(() => {
    if (!selectedMuscle) return null
    return analysis.muscleBreakdown.find(m => m.slug === selectedMuscle) || null
  }, [selectedMuscle, analysis])

  const selectedMuscleRecs = useMemo(() => {
    if (!selectedMuscle) return []
    const existingIds = (activeRoutine?.ex || []).map(e => e.id)
    return getRecommendedExercisesForMuscle(selectedMuscle, 3, existingIds)
  }, [selectedMuscle, activeRoutine])

  // Color mapping for category progress bars
  const categoryKeys = ['push', 'pull', 'legs', 'core']

  return (
    <div
      className={`card routine-muscle-engagement-card ${className}`}
      style={{
        padding: '16px 18px',
        position: 'relative'
      }}
    >
      {/* Header zone with title, routine switch, and body silhouette toggle */}
      <div className="row between" style={{ alignItems: 'flex-start', marginBottom: 12, gap: 10 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="row" style={{ alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--acc)', fontSize: 16, display: 'inline-flex' }}>
              <Icon name="figureStrength" />
            </span>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: '-0.015em' }}>
              {title || t('Muscle Engagement & Gaps')}
            </h2>
          </div>

          <div
            className="small dim"
            style={{
              marginTop: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12
            }}
          >
            {activeRoutine?.name ? (
              <>
                <Icon name={glyphOf(activeRoutine?.emoji)} style={{ fontSize: 12 }} />
                <span style={{ fontWeight: 500, color: 'var(--label)' }}>{activeRoutine.name}</span>
                <span>·</span>
                <span>{t('{0} exercises', analysis.totalExercises)}</span>
                <span>·</span>
                <span className="tabular-nums font-mono">{analysis.totalEffectiveSets} {t('sets')}</span>
              </>
            ) : (
              <span>{t('No routine selected')}</span>
            )}
          </div>
        </div>

        <div className="row" style={{ gap: 6, alignItems: 'center', flexShrink: 0 }}>
          {/* Routine Selector Dropdown (when multiple routines exist and selector is enabled) */}
          {showRoutineSelector && storeRoutines.length > 1 && !propRoutine && (
            <select
              value={activeRoutine?.id || ''}
              onChange={handleRoutineChange}
              className="tappable"
              aria-label={t('Select routine to inspect')}
              style={{
                background: 'var(--surface-2)',
                color: 'var(--label)',
                border: '1px solid var(--sep)',
                borderRadius: 8,
                padding: '4px 8px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
                maxWidth: 135
              }}
            >
              {storeRoutines.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}

          {/* Gender silhouette switch */}
          <button
            type="button"
            className="iconbtn"
            onClick={() => setBodySilhouette(b => (b === 'female' ? 'male' : 'female'))}
            title={bodySilhouette === 'female' ? t('Switch to Male Silhouette') : t('Switch to Female Silhouette')}
            aria-label={t('Toggle anatomy silhouette')}
            style={{
              width: 32,
              height: 32,
              fontSize: 13,
              borderRadius: 8,
              background: 'var(--surface-2)',
              border: '1px solid var(--sep)',
              color: 'var(--label-2)'
            }}
          >
            <Icon name="person" />
          </button>
        </div>
      </div>

      {/* High-level Engagement Summary KPI Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          marginBottom: 14
        }}
      >
        <div
          style={{
            background: 'var(--surface-2)',
            borderRadius: 10,
            padding: '8px 10px',
            textAlign: 'center'
          }}
        >
          <div className="dim small" style={{ fontSize: 11, marginBottom: 2 }}>{t('Targeted')}</div>
          <div style={{ fontWeight: 700, fontSize: 16 }} className="tabular-nums font-mono">
            {analysis.engagedMusclesCount} <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--label-2)' }}>/ 18</span>
          </div>
        </div>

        <div
          style={{
            background: 'var(--surface-2)',
            borderRadius: 10,
            padding: '8px 10px',
            textAlign: 'center'
          }}
        >
          <div className="dim small" style={{ fontSize: 11, marginBottom: 2 }}>{t('Effective sets')}</div>
          <div style={{ fontWeight: 700, fontSize: 16 }} className="tabular-nums font-mono">
            {analysis.totalEffectiveSets}
          </div>
        </div>

        <div
          style={{
            background: analysis.gaps.length > 0
              ? 'color-mix(in srgb, var(--orange, #ff9f0a) 12%, var(--surface-2))'
              : 'color-mix(in srgb, var(--green, #30d158) 12%, var(--surface-2))',
            borderRadius: 10,
            padding: '8px 10px',
            textAlign: 'center'
          }}
        >
          <div
            className="small"
            style={{
              fontSize: 11,
              marginBottom: 2,
              color: analysis.gaps.length > 0 ? 'var(--orange, #ff9f0a)' : 'var(--green, #30d158)',
              fontWeight: 600
            }}
          >
            {analysis.gaps.length > 0 ? t('Potential gaps') : t('Balance')}
          </div>
          <div
            style={{
              fontWeight: 700,
              fontSize: 16,
              color: analysis.gaps.length > 0 ? 'var(--orange, #ff9f0a)' : 'var(--green, #30d158)'
            }}
            className="tabular-nums font-mono"
          >
            {analysis.gaps.length > 0 ? `${analysis.gaps.length} ${t('detected')}` : t('Optimal')}
          </div>
        </div>
      </div>

      {/* Movement Pattern Volume Multi-Segment Bar */}
      <div style={{ marginBottom: 16 }}>
        <div className="row between" style={{ marginBottom: 6, fontSize: 12, alignItems: 'center' }}>
          <span style={{ fontWeight: 600, color: 'var(--label-2)' }}>{t('Volume by movement pattern')}</span>
          <div className="row" style={{ gap: 8, fontSize: 11 }}>
            {analysis.pushPullBalance.status === 'push_heavy' && (
              <span style={{ color: 'var(--orange, #ff9f0a)', fontWeight: 600 }}>
                {t('Push dominant ({0}:1)', analysis.pushPullBalance.ratio)}
              </span>
            )}
            {analysis.pushPullBalance.status === 'pull_heavy' && (
              <span style={{ color: 'var(--orange, #ff9f0a)', fontWeight: 600 }}>
                {t('Pull dominant (1:{0})', (1 / Math.max(0.01, analysis.pushPullBalance.ratio)).toFixed(1))}
              </span>
            )}
            {analysis.pushPullBalance.status === 'balanced' && analysis.pushPullBalance.pushSets > 0 && (
              <span style={{ color: 'var(--green, #30d158)', fontWeight: 600 }}>
                {t('Push:Pull balanced')}
              </span>
            )}
            {analysis.quadHamBalance.status === 'quad_dominant' && (
              <span style={{ color: 'var(--orange, #ff9f0a)', fontWeight: 600 }}>
                · {t('Quad heavy')}
              </span>
            )}
          </div>
        </div>

        {/* Multi-segmented distribution bar */}
        <div
          style={{
            height: 10,
            borderRadius: 5,
            background: 'var(--surface-2)',
            display: 'flex',
            overflow: 'hidden',
            marginBottom: 8
          }}
        >
          {analysis.totalEffectiveSets > 0 ? (
            categoryKeys.map(catKey => {
              const cat = MUSCLE_CATEGORIES[catKey]
              const vol = analysis.categoryVolumes[catKey]
              if (vol.sets <= 0) return null
              return (
                <div
                  key={catKey}
                  style={{
                    width: `${vol.pct}%`,
                    backgroundColor: cat.color,
                    transition: 'width 0.3s ease'
                  }}
                  title={`${cat.label}: ${vol.sets} sets (${vol.pct}%)`}
                />
              )
            })
          ) : (
            <div style={{ width: '100%', backgroundColor: 'var(--sep)' }} />
          )}
        </div>

        {/* Legend of 4 categories */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 4,
            fontSize: 11
          }}
        >
          {categoryKeys.map(catKey => {
            const cat = MUSCLE_CATEGORIES[catKey]
            const vol = analysis.categoryVolumes[catKey]
            return (
              <div
                key={catKey}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  minWidth: 0
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 2,
                    backgroundColor: cat.color,
                    flexShrink: 0
                  }}
                />
                <span
                  className="dim"
                  style={{
                    fontSize: 11,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {cat.label}
                </span>
                <span
                  style={{
                    fontWeight: 600,
                    marginLeft: 'auto',
                    fontSize: 11
                  }}
                  className="tabular-nums font-mono"
                >
                  {vol.sets}s
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Interactive View Navigation Tabs */}
      <div className="seg" style={{ marginBottom: 14 }}>
        <button
          type="button"
          className={activeTab === 'gaps' ? 'on' : ''}
          onClick={() => setActiveTab('gaps')}
        >
          <span className="row" style={{ gap: 5, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="lightbulb" style={{ fontSize: 13 }} />
            <span>{t('Gaps & Balance')}</span>
            {analysis.gaps.length > 0 && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: 6,
                  background: 'var(--orange, #ff9f0a)',
                  color: '#000'
                }}
              >
                {analysis.gaps.length}
              </span>
            )}
          </span>
        </button>

        <button
          type="button"
          className={activeTab === 'map' ? 'on' : ''}
          onClick={() => setActiveTab('map')}
        >
          <span className="row" style={{ gap: 5, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="person" style={{ fontSize: 13 }} />
            <span>{t('Body Map')}</span>
          </span>
        </button>

        <button
          type="button"
          className={activeTab === 'list' ? 'on' : ''}
          onClick={() => setActiveTab('list')}
        >
          <span className="row" style={{ gap: 5, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="list" style={{ fontSize: 13 }} />
            <span>{t('All Muscles')}</span>
          </span>
        </button>
      </div>

      {/* TAB 1: GAPS & OPPORTUNITIES */}
      {activeTab === 'gaps' && (
        <div>
          {analysis.gaps.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {analysis.gaps.map(gap => (
                <div
                  key={gap.id}
                  style={{
                    background: 'var(--surface-2)',
                    borderRadius: 12,
                    padding: '12px 14px',
                    border: '1px solid color-mix(in srgb, var(--orange, #ff9f0a) 25%, var(--sep))'
                  }}
                >
                  <div className="row between" style={{ alignItems: 'flex-start', marginBottom: 6 }}>
                    <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                      <span
                        style={{
                          color: gap.severity === 'high' ? 'var(--orange, #ff9f0a)' : 'var(--acc)',
                          fontSize: 15,
                          display: 'inline-flex'
                        }}
                      >
                        <Icon name="target" />
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{gap.title}</span>
                    </div>

                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        color: gap.severity === 'high' ? 'var(--orange, #ff9f0a)' : 'var(--label-2)'
                      }}
                    >
                      {gap.severity === 'high' ? t('Priority Gap') : t('Opportunity')}
                    </span>
                  </div>

                  <p
                    className="dim"
                    style={{
                      margin: '0 0 10px 0',
                      fontSize: 13,
                      lineHeight: 1.45
                    }}
                  >
                    {gap.description}
                  </p>

                  {/* Recommended Exercises to address this gap */}
                  {gap.recommendedExercises.length > 0 && (
                    <div>
                      <div
                        className="small"
                        style={{
                          fontWeight: 600,
                          fontSize: 11,
                          color: 'var(--label-2)',
                          marginBottom: 6,
                          textTransform: 'uppercase',
                          letterSpacing: '0.03em'
                        }}
                      >
                        {t('Recommended additions')}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {gap.recommendedExercises.map(ex => (
                          <div
                            key={ex.id}
                            className="tappable"
                            onClick={() => exerciseDetailSheet(ex)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: 'var(--surface)',
                              border: '1px solid var(--sep)',
                              borderRadius: 8,
                              padding: '6px 10px',
                              cursor: 'pointer',
                              gap: 10
                            }}
                          >
                            <div className="row" style={{ gap: 8, alignItems: 'center', minWidth: 0 }}>
                              <div style={{ width: 28, height: 28, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                                <Thumb ex={ex} />
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div
                                  style={{
                                    fontWeight: 600,
                                    fontSize: 13,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {ex.n}
                                </div>
                                <div className="dim small" style={{ fontSize: 11 }}>
                                  {ex.eq || t('Standard')}
                                </div>
                              </div>
                            </div>

                            <div className="row" style={{ gap: 6, alignItems: 'center', flexShrink: 0 }}>
                              {(editable || onAddExercise) ? (
                                <Button
                                  size="sm"
                                  variant="tinted"
                                  icon="plus"
                                  onClick={e => {
                                    e.stopPropagation()
                                    if (onAddExercise) onAddExercise(ex)
                                    else addToRoutineSheet(ex)
                                  }}
                                >
                                  {t('Add')}
                                </Button>
                              ) : (
                                <span style={{ color: 'var(--label-3)', fontSize: 13 }}>
                                  <Icon name="chevronRight" />
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '24px 16px',
                background: 'var(--surface-2)',
                borderRadius: 12
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  background: 'color-mix(in srgb, var(--green, #30d158) 18%, transparent)',
                  color: 'var(--green, #30d158)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px',
                  fontSize: 22
                }}
              >
                <Icon name="checkCircle" />
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                {t('Symmetrical & Balanced Session')}
              </div>
              <div className="dim small" style={{ maxWidth: 360, margin: '0 auto', lineHeight: 1.45 }}>
                {analysis.totalExercises > 0
                  ? t('No critical imbalances or omitted antagonists detected. Opposing muscle groups and synergists are in sound proportion.')
                  : t('Add exercises to this routine to see real-time balance calculations and gap analysis.')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INTERACTIVE ANATOMICAL BODY MAP */}
      {activeTab === 'map' && (
        <div>
          <div
            style={{
              background: 'var(--surface-2)',
              borderRadius: 12,
              padding: '14px 10px 10px',
              position: 'relative'
            }}
          >
            <div
              className="small dim"
              style={{
                textAlign: 'center',
                marginBottom: 8,
                fontSize: 12
              }}
            >
              {t('Tap any muscle to see sets and contributing exercises')}
            </div>

            <BodyMap
              load={analysis.load}
              body={bodySilhouette}
              selected={selectedMuscle}
              onMuscle={slug => setSelectedMuscle(prev => (prev === slug ? null : slug))}
              className="tappable"
            />

            <div style={{ marginTop: 8 }}>
              <BodyMapLegend />
            </div>
          </div>

          {/* Selected Muscle Deep-Dive Inspector */}
          {selectedMuscleData ? (
            <div
              style={{
                marginTop: 12,
                background: 'var(--surface-2)',
                borderRadius: 12,
                padding: '12px 14px',
                border: '1px solid var(--sep)'
              }}
            >
              <div className="row between" style={{ alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>
                    {t(selectedMuscleData.name)}
                  </div>
                  <div className="dim small" style={{ textTransform: 'capitalize', fontSize: 11 }}>
                    {selectedMuscleData.category}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }} className="tabular-nums font-mono">
                    {selectedMuscleData.effectiveSets} {t('sets')}
                  </div>
                  <div
                    className="small"
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color:
                        selectedMuscleData.effectiveSets >= 3
                          ? 'var(--green, #30d158)'
                          : selectedMuscleData.effectiveSets > 0
                          ? 'var(--acc)'
                          : 'var(--orange, #ff9f0a)'
                    }}
                  >
                    {selectedMuscleData.effectiveSets >= 3
                      ? t('Primary focus')
                      : selectedMuscleData.effectiveSets > 0
                      ? t('Secondary stimulus')
                      : t('Untrained in this session')}
                  </div>
                </div>
              </div>

              {/* Contributing Exercises List */}
              {selectedMuscleData.contributions.length > 0 ? (
                <div>
                  <div className="small dim" style={{ marginBottom: 4, fontSize: 11, fontWeight: 600 }}>
                    {t('Planned exercises targeting this muscle:')}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {selectedMuscleData.contributions.map((c, i) => (
                      <div
                        key={i}
                        className="row between"
                        style={{
                          fontSize: 12,
                          padding: '3px 0',
                          borderBottom: i < selectedMuscleData.contributions.length - 1 ? '1px solid var(--sep)' : 'none'
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>{c.name}</span>
                        <span className="dim tabular-nums font-mono">
                          {c.sets} {t('sets')} ({Math.round(c.weight * 100)}% {t('load')})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="small dim" style={{ marginBottom: 6, fontSize: 12 }}>
                    {t('No exercises in this session stimulate the {0}.', t(selectedMuscleData.name))}
                  </div>
                  {selectedMuscleRecs.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                      <div className="small" style={{ fontWeight: 600, fontSize: 11, color: 'var(--label-2)' }}>
                        {t('Add exercise to train this muscle:')}
                      </div>
                      {selectedMuscleRecs.map(ex => (
                        <div
                          key={ex.id}
                          className="tappable"
                          onClick={() => exerciseDetailSheet(ex)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'var(--surface)',
                            border: '1px solid var(--sep)',
                            borderRadius: 8,
                            padding: '6px 10px',
                            cursor: 'pointer'
                          }}
                        >
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{ex.n}</span>
                          {(editable || onAddExercise) && (
                            <Button
                              size="sm"
                              variant="tinted"
                              icon="plus"
                              onClick={e => {
                                e.stopPropagation()
                                if (onAddExercise) onAddExercise(ex)
                                else addToRoutineSheet(ex)
                              }}
                            >
                              {t('Add')}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="small dim" style={{ textAlign: 'center', marginTop: 10, fontSize: 12 }}>
              {t('Click on any shaded region above to inspect effective volume and exercises.')}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ALL MUSCLES LIST BREAKDOWN */}
      {activeTab === 'list' && (
        <div>
          {/* Category Filter Chips */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              overflowX: 'auto',
              paddingBottom: 8,
              marginBottom: 10
            }}
          >
            {[
              { id: 'all', label: t('All') },
              { id: 'push', label: t('Push') },
              { id: 'pull', label: t('Pull') },
              { id: 'legs', label: t('Legs') },
              { id: 'core', label: t('Core') }
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setCategoryFilter(f.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: categoryFilter === f.id ? 700 : 500,
                  background: categoryFilter === f.id ? 'var(--label)' : 'var(--surface-2)',
                  color: categoryFilter === f.id ? 'var(--bg, #000)' : 'var(--label)',
                  border: '1px solid var(--sep)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Muscles Ranked List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {analysis.muscleBreakdown
              .filter(m => categoryFilter === 'all' || m.category === categoryFilter)
              .map(m => {
                const maxSets = Math.max(1, ...analysis.muscleBreakdown.map(x => x.effectiveSets))
                const barWidth = Math.round((m.effectiveSets / maxSets) * 100)
                const isUntrained = m.effectiveSets === 0
                const isSelected = selectedMuscle === m.slug

                return (
                  <div
                    key={m.slug}
                    className="tappable"
                    onClick={() => {
                      setSelectedMuscle(isSelected ? null : m.slug)
                      if (!isSelected) setActiveTab('map')
                    }}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      background: isSelected ? 'var(--surface-2)' : 'transparent',
                      border: isSelected ? '1px solid var(--acc)' : '1px solid transparent',
                      cursor: 'pointer'
                    }}
                  >
                    <div className="row between" style={{ alignItems: 'center', marginBottom: 4 }}>
                      <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: isUntrained
                              ? 'var(--sep)'
                              : MUSCLE_CATEGORIES[m.category]?.color || 'var(--acc)'
                          }}
                        />
                        <span
                          style={{
                            fontWeight: isUntrained ? 400 : 600,
                            color: isUntrained ? 'var(--label-2)' : 'var(--label)',
                            fontSize: 13
                          }}
                        >
                          {t(m.name)}
                        </span>
                      </div>

                      <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: isUntrained ? 400 : 600,
                            color: isUntrained ? 'var(--label-3)' : 'var(--label)'
                          }}
                          className="tabular-nums font-mono"
                        >
                          {m.effectiveSets > 0 ? `${m.effectiveSets}s` : t('0s')}
                        </span>
                        {isUntrained && (
                          <span
                            style={{
                              fontSize: 10,
                              color: 'var(--orange, #ff9f0a)',
                              fontWeight: 600
                            }}
                          >
                            {t('Gap')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div
                      style={{
                        height: 4,
                        borderRadius: 2,
                        background: 'var(--surface-2)',
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${barWidth}%`,
                          backgroundColor:
                            m.effectiveSets >= 3
                              ? 'var(--green, #30d158)'
                              : MUSCLE_CATEGORIES[m.category]?.color || 'var(--acc)',
                          borderRadius: 2
                        }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
