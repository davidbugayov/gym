import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { DAYN, uid, exCount } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { dayAssignSheet, planToolsSheet, programWizardSheet, readyProgramsSheet, importUrlSheet, calendarSyncSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import { glyphOf, DEFAULT_GLYPH } from '../lib/glyphs.js'
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
      <button className="iconbtn" onClick={calendarSyncSheet} aria-label={t('Sync with System Calendar')} title={t('Sync with System Calendar')}><Icon name="calendar" /></button>
      <button className="iconbtn" onClick={() => importUrlSheet()} aria-label={t('Import program from URL')} title={t('Import program from URL')}><Icon name="globe" /></button>
      {coachOn && <button className="iconbtn" onClick={() => nav('/coach')} aria-label={t('Coach')} title={t('Coach')}><Icon name="sparkles" /></button>}
      <button className="iconbtn" onClick={planToolsSheet} aria-label={t('Share your plan')} title={t('Share your plan')}><Icon name="upload" /></button>
    </div>
    <div className="cols"><div>
      <h4 className="sec">{t('Week schedule')}</h4>
      <div className="list" style={{ display: 'flex', flexDirection: 'column' }}>
        {[1, 2, 3, 4, 5, 6, 0].map(d => {
          const r = S.routines.find(x => x.id === S.week[d])
          return <div key={d} className="item" onClick={() => dayAssignSheet(d)}>
            <div className="grow"><div className="tt">{t(DAYN[d])}</div></div>
            {r ? <span className="tag acc"><Icon name={glyphOf(r.emoji)} />{r.name}</span> : <span className="tag">{t('Rest')}</span>}
            <Icon name="chevronRight" className="chev" /></div>
        })}
      </div>
    </div><div>
      <div className="row between" style={{ marginTop: 22, marginBottom: 10 }}>
        <h4 className="sec" style={{ margin: 0 }}>{t('Routines')}</h4>
        <div className="row" style={{ gap: 6 }}>
          <Button size="sm" variant="tinted" icon="globe" onClick={() => importUrlSheet()}>{t('URL')}</Button>
          <Button size="sm" variant="tinted" icon="sparkles" onClick={readyProgramsSheet}>{t('Ready-made programs')}</Button>
          <Button size="sm" variant="tinted" icon="plus" onClick={addRoutine}>{t('New')}</Button>
        </div>
      </div>
      {S.routines.length ? <div className="workout-grid">{S.routines.map(r => <button key={r.id} type="button" className="workout-grid-card" onClick={() => nav('/plan/r/' + r.id)}>
        <div className="workout-grid-top">
          <span className="lrow-i"><Icon name={glyphOf(r.emoji)} /></span>
          <Icon name="chevronRight" className="chev" style={{ fontSize: 13 }} />
        </div>
        <div>
          <div className="workout-grid-name">{r.name}</div>
          <div className="workout-grid-meta">{exCount(r.ex.length)}</div>
        </div>
      </button>)}</div> : <>
        <div className="empty"><div className="ico"><Icon name="clipboard" /></div>{t('No routines yet.')}<br />{t('Create one or load the starter plan.')}</div>
      </>}
    </div></div>
  </>
}
