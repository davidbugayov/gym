import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { DAYN, uid, exCount } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { dayAssignSheet, planToolsSheet, programWizardSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import { glyphOf, DEFAULT_GLYPH } from '../lib/glyphs.js'
import { exOr } from '../lib/exercises.js'
import { coachAvailable } from '../lib/coach.js'
import { DEMO } from '../lib/demo.js'
import { MOBILE } from '../lib/mobile.js'

export default function Plan() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const config = useStore(s => s.config)
  const update = useStore(s => s.update)
  const coachOn = coachAvailable(config, user, { demo: DEMO, mobile: MOBILE })

  const addRoutine = () => {
    const r = { id: uid(), name: t('New routine'), emoji: DEFAULT_GLYPH, ex: [] }
    update(s => { s.routines.push(r) })
    nav('/plan/r/' + r.id)
  }

  return <>
    <div className="hdr">
      <div><h1>{t('Plan')}</h1><div className="sub">{t('Your weekly routine')}</div></div>
      {coachOn && <button className="iconbtn" onClick={() => nav('/coach')} aria-label={t('Coach')} title={t('Coach')}><Icon name="sparkles" /></button>}
      <button className="iconbtn" onClick={planToolsSheet} aria-label={t('Share your plan')} title={t('Share your plan')}><Icon name="upload" /></button>
    </div>
    <div className="cols"><div>
      <h4 className="sec">{t('Week schedule')}</h4>
      <div className="list" style={{ display: 'flex', flexDirection: 'column' }}>
        {[1, 2, 3, 4, 5, 6, 0].map(d => {
          const r = S.routines.find(x => x.id === S.week[d])
          const exPreview = r && r.ex.length > 0
            ? r.ex.slice(0, 3).map(e => exOr(e.id).n).join(', ') + (r.ex.length > 3 ? '…' : '')
            : null
          return <div key={d} className="item" onClick={() => dayAssignSheet(d)}>
            <div className="grow">
              <div className="tt">{t(DAYN[d])}</div>
              {exPreview && <div className="ss capitalize" style={{ fontSize: 12, marginTop: 1 }}>{exPreview}</div>}
            </div>
            {r ? <span className="tag acc"><Icon name={glyphOf(r.emoji)} />{r.name}</span> : <span className="tag">{t('Rest')}</span>}
            <Icon name="chevronRight" className="chev" /></div>
        })}
      </div>
    </div><div>
      <div className="row between" style={{ marginTop: 22, marginBottom: 10 }}>
        <h4 className="sec" style={{ margin: 0 }}>{t('Routines')}</h4>
        <div className="row" style={{ gap: 8 }}>
          <Button size="sm" variant="tinted" icon="sparkles" onClick={programWizardSheet}>{t('Ready-made programs')}</Button>
          <Button size="sm" variant="tinted" icon="plus" onClick={addRoutine}>{t('New')}</Button>
        </div>
      </div>
      {S.routines.length ? <div className="list">{S.routines.map(r => {
        const scheduledDays = [1, 2, 3, 4, 5, 6, 0].filter(d => S.week[d] === r.id)
        const exPreview = r.ex.slice(0, 3).map(e => exOr(e.id).n).join(', ') + (r.ex.length > 3 ? '…' : '')
        return (
          <div key={r.id} className="item" onClick={() => nav('/plan/r/' + r.id)}>
            <span className="lrow-i"><Icon name={glyphOf(r.emoji)} /></span>
            <div className="grow">
              <div className="row between" style={{ alignItems: 'center' }}>
                <div className="tt" style={{ fontWeight: 600 }}>{r.name}</div>
                {scheduledDays.length > 0 && (
                  <span className="tag acc" style={{ fontSize: 11 }}>
                    {scheduledDays.map(d => t(DAYN[d])).join(', ')}
                  </span>
                )}
              </div>
              <div className="ss capitalize" style={{ marginTop: 2 }}>
                {exCount(r.ex.length)}{exPreview ? ` · ${exPreview}` : ''}
              </div>
            </div>
            <Icon name="chevronRight" className="chev" />
          </div>
        )
      })}</div> : <>
        <div className="empty"><div className="ico"><Icon name="clipboard" /></div>{t('No routines yet.')}<br />{t('Create one or load the starter plan.')}</div>
      </>}
    </div></div>
  </>
}
