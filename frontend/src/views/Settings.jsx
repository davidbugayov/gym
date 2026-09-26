import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, DEF, hasData } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { ACCENTS, todayISO, localTZ, fmtDateFromTs } from '../lib/format.js'
import { effortOf } from '../lib/history.js'
import { webauthnOK, passkeyLogin, passkeyRegister, IS_ANDROID } from '../lib/api.js'
import { pushSupported, enablePush, disablePush, sendTestPush } from '../lib/push.js'
import { wakeLockSupported } from '../lib/wakelock.js'
import { t, LANGS, INSTR_LANGS, useLanguage } from '../lib/i18n.js'
import { DEMO, REPO } from '../lib/demo.js'
import { MOBILE, shareExport, syncReminder, isBackupOverdue, getDaysSinceLastBackup, BACKUP_PROMPT_INTERVAL_DAYS } from '../lib/mobile.js'
import { programWizardSheet, confirmSheet, importFromApp, googleHealthSheet, importUrlSheet, warmupCooldownSheet } from '../sheets.jsx'
import { coachAvailable, hasConsent } from '../lib/coach.js'
import { forgetCoach } from '../lib/coach-api.js'
import { playRestTimerAlert, hapticSetComplete } from '../lib/sound.js'
import { googleSignIn, googleSignOut } from '../lib/google-auth.js'
import GoogleSignInButton from '../components/GoogleSignInButton.jsx'
import Icon from '../components/Icon.jsx'
import { Section, Row, SelectRow, Switch, Segmented, Button, TextField } from '../components/ui.jsx'
import { calcSolarTimes, isDaytime, DEF_THEME_CONFIG } from '../lib/theme.js'

export default function Settings() {
  const { lang, setLanguage } = useLanguage()
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const config = useStore(s => s.config)
  const { update, replaceState, setUser, pullState, pushState, signOut, signOutAll, resetDemo } = useStore()
  const toast = useUI(s => s.toast)
  const fileRef = useRef(null)
  const importRef = useRef(null)
  const wakeOK = wakeLockSupported()

  const themeCfg = S.themeConfig || DEF_THEME_CONFIG
  const themeMode = themeCfg.mode || (S.theme === 'light' || S.theme === 'dark' || S.theme === 'system' ? S.theme : 'auto')
  const isDay = isDaytime(themeCfg.sunrise, themeCfg.sunset)
  const now = new Date()
  const curTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const onThemeModeChange = mode => {
    update(s => {
      s.theme = mode
      s.themeConfig = {
        ...(s.themeConfig || DEF_THEME_CONFIG),
        mode
      }
    })
  }

  const onSunriseChange = val => {
    if (!val) return
    update(s => {
      s.themeConfig = {
        ...(s.themeConfig || DEF_THEME_CONFIG),
        sunrise: val
      }
    })
  }

  const onSunsetChange = val => {
    if (!val) return
    update(s => {
      s.themeConfig = {
        ...(s.themeConfig || DEF_THEME_CONFIG),
        sunset: val
      }
    })
  }

  const detectSolarTimes = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const { latitude, longitude } = pos.coords
          const times = calcSolarTimes(new Date(), latitude, longitude)
          update(s => {
            s.themeConfig = {
              ...(s.themeConfig || DEF_THEME_CONFIG),
              sunrise: times.sunrise,
              sunset: times.sunset,
              lat: latitude,
              lon: longitude
            }
          })
          toast(t('Updated: Sunrise {0} · Sunset {1}', times.sunrise, times.sunset))
        },
        () => {
          const estLon = -new Date().getTimezoneOffset() / 4
          const times = calcSolarTimes(new Date(), 50, estLon)
          update(s => {
            s.themeConfig = {
              ...(s.themeConfig || DEF_THEME_CONFIG),
              sunrise: times.sunrise,
              sunset: times.sunset
            }
          })
          toast(t('Estimated: Sunrise {0} · Sunset {1}', times.sunrise, times.sunset))
        },
        { timeout: 5000 }
      )
    } else {
      const times = calcSolarTimes(new Date())
      update(s => {
        s.themeConfig = {
          ...(s.themeConfig || DEF_THEME_CONFIG),
          sunrise: times.sunrise,
          sunset: times.sunset
        }
      })
      toast(t('Sunrise {0} · Sunset {1}', times.sunrise, times.sunset))
    }
  }

  const doExport = async () => {
    const json = JSON.stringify(S, null, 2)
    const name = 'gymly-backup-' + todayISO() + '.json'
    // WKWebView can't download blob URLs — the native build hands the file to the share sheet.
    if (MOBILE) {
      try {
        await shareExport(json, name)
        update(s => { s.lastBackupAt = Date.now(); delete s.lastBackupDismissedAt })
        toast(t('Backup exported'))
      } catch (e) { /* share sheet dismissed */ }
      return
    }
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href)
    update(s => { s.lastBackupAt = Date.now(); delete s.lastBackupDismissedAt })
    toast(t('Backup exported'))
  }
  const doImport = ev => {
    const f = ev.target.files[0]; if (!f) return
    const rd = new FileReader()
    rd.onload = () => {
      try {
        const data = JSON.parse(rd.result)
        if (!data.workouts || !data.routines) throw new Error('not an Gymly backup')
        confirmSheet({ title: t('Import backup?'), message: t('This replaces all current data with the backup file.'), confirmText: t('Import'), danger: true, onConfirm: () => { replaceState(Object.assign(JSON.parse(JSON.stringify(DEF)), data), true); toast(t('Backup imported')) } })
      } catch (e) { toast(t('Import failed: {0}', e.message)) }
    }
    rd.readAsText(f)
  }
  const [googleLoading, setGoogleLoading] = useState(false)
  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    try {
      const res = await googleSignIn()
      toast(t('Signed in as {0}', res.profile.name))
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user') {
        toast(t('Google Sign-in failed: {0}', e.message || 'Error'))
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleGoogleLogout = async () => {
    try {
      await googleSignOut()
      toast(t('Signed out from Google Account'))
    } catch (e) {
      toast(e.message)
    }
  }

  const signInHere = async () => {
    try { const u = await passkeyLogin(); setUser(u); await pullState(); toast(t('Welcome back, {0}', u.name)) }
    catch (e) { if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') toast(e.message || t('Sign-in failed')) }
  }
  const registerHere = () => useUI.getState().openSheet(close => <RegisterInline close={close} setUser={setUser} pushState={pushState} pullState={pullState} toast={toast} />)
  // Ends the profile's sessions on every device — this one included, so on success it lands in
  // the same place as the plain sign-out above (home, local data cleared). On failure nothing
  // local is touched: still signed in here, and say so rather than leaving a half-signed-out app.
  const signOutEverywhere = () => confirmSheet({
    title: t('Sign out everywhere?'),
    message: t('Signs this profile out on every device, including this one. Your passkeys keep working — sign in with them again anytime.'),
    confirmText: t('Sign out everywhere'), danger: true,
    onConfirm: async () => {
      try { await signOutAll(); nav('/home'); toast(t('Signed out on all devices')) }
      catch (e) { toast(t('Could not sign out everywhere — you are still signed in.')) }
    },
  })

  return <div className="narrow">
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav('/home')} aria-label={t('Home')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginLeft: 10 }}><h1>{t('Settings')}</h1></div>
    </div>

    {/* Periodic Mobile Backup Prompt Notification */}
    {MOBILE && isBackupOverdue(S) && (
      <BackupPromptCard
        S={S}
        onExport={doExport}
        onDismiss={() => {
          update(s => { s.lastBackupDismissedAt = Date.now() })
          toast(t('Reminder postponed for 7 days'))
        }}
      />
    )}

    {/* ---------- account (Google Gmail + Passkeys) ---------- */}
    <Section title={MOBILE ? t('Your data') : DEMO ? t('Demo') : t('Account')}>
      {MOBILE ? <>
        <Row
          icon="lock"
          iconTint="var(--acc)"
          title={t('All data stays on this phone')}
          subtitle={S.lastBackupAt
            ? t('No cloud sync — last backed up on {0}.', fmtDateFromTs(S.lastBackupAt))
            : t('No account, no cloud — back it up anytime with Export below.')}
        />
        <Row icon="rocket" iconTint="var(--indigo)" title={t('Self-host Gymly')} subtitle={t('Passkey sign-in, sync across your devices, your own data.')} accessory="chevron"
          onClick={() => window.open(REPO, '_blank', 'noopener')} />
      </> : DEMO ? <>
        <Row icon="sparkles" iconTint="var(--acc)" title={t('You’re in the demo')} subtitle={t('Example data, stored only in this browser — change anything you like.')} />
        <Row icon="reset" iconTint="var(--blue)" title={t('Reset demo data')} accessory="chevron"
          onClick={() => confirmSheet({ title: t('Reset demo data?'), message: t('Puts the example plan, workouts and weigh-ins back the way they started.'), confirmText: t('Reset'), onConfirm: () => { resetDemo(); nav('/home'); toast(t('Demo data reset')) } })} />
        <Row icon="rocket" iconTint="var(--indigo)" title={t('Self-host Gymly')} subtitle={t('Passkey sign-in, sync across your devices, your own data.')} accessory="chevron"
          onClick={() => window.open(REPO, '_blank', 'noopener')} />
      </> : user ? <>
        <Row
          icon="personCircle"
          iconTint={user.provider === 'google' ? '#4285F4' : 'var(--grey)'}
          title={user.name}
          subtitle={user.email ? `${user.email} · ${t('Google Account')}` : t('Signed in with passkey — data syncs to this profile.')}
        />
        <Row
          icon="heart"
          iconTint="#4285F4"
          title={t('Google Health')}
          subtitle={S.googleHealth?.connected ? t('Connected to Google Health') : t('Not connected')}
          accessory="chevron"
          onClick={googleHealthSheet}
        />
        {user.admin && <Row icon="wrench" iconTint="var(--indigo)" title={t('Admin dashboard')} accessory="chevron" onClick={() => nav('/admin')} />}
        <Row
          icon="signOut"
          iconTint="var(--red)"
          title={t('Sign out')}
          danger
          onClick={() => confirmSheet({
            title: t('Sign out?'),
            message: t('Your data is preserved in this browser. You can sign in again anytime.'),
            confirmText: t('Sign out'),
            danger: true,
            onConfirm: async () => {
              if (user.provider === 'google') await handleGoogleLogout()
              else signOut()
              nav('/home')
            }
          })}
        />
        {user.provider !== 'google' && (
          <Row icon="shield" iconTint="var(--red)" title={t('Sign out everywhere')} subtitle={t('Ends this profile’s sessions on all your devices.')} danger onClick={signOutEverywhere} />
        )}
      </> : <>
        <div style={{ padding: '8px 12px 10px' }}>
          <GoogleSignInButton
            onClick={handleGoogleLogin}
            loading={googleLoading}
            text={t('Sign in with Google (Gmail)')}
          />
        </div>
        <Row
          icon="heart"
          iconTint="#4285F4"
          title={t('Google Health')}
          subtitle={t('Sync workouts and body weight with Google Health')}
          accessory="chevron"
          onClick={googleHealthSheet}
        />
        {webauthnOK() ? <>
          <Row icon="sparkles" iconTint="var(--acc)" title={t('Create passkey profile')} subtitle={t('Keeps your data safe and separate per person.')} accessory="chevron" onClick={registerHere} />
          <Row icon="person" iconTint="var(--blue)" title={t('Sign in with passkey')} accessory="chevron" onClick={signInHere} />
        </> : (
          <Row icon="lock" iconTint="var(--grey)" title={t('Passkeys not supported in this browser.')} />
        )}
      </>}
    </Section>
    {!user && !DEMO && !MOBILE && <p className="sect-f" style={{ marginTop: -18, marginBottom: 22 }}>{t('Guest mode — data lives only in this browser.')}</p>}

    {/* ---------- general ---------- */}
    <Section title={t('General')} footer={t('Note: switching units only changes the label — logged numbers are not converted.')}>
      <SelectRow
        icon="globe" iconTint="var(--blue)" title={t('Language')}
        value={S.lang || 'en'} onChange={v => update(s => { s.lang = v })}
        options={Object.entries(LANGS).map(([k, name]) => ({
          value: k, label: name,
          subtitle: INSTR_LANGS.includes(k) ? null : t("Exercise instructions aren't available in this language yet — they stay in English."),
        }))}
      />
      <Row icon="scale" iconTint="var(--teal)" title={t('Weight unit')}>
        <Segmented className="seg-inline"
          options={[{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]}
          value={S.unit} onChange={v => update(s => { s.unit = v })} />
      </Row>
    </Section>

    {/* ---------- during a workout ---------- */}
    <Section title={t('During a workout')} footer={wakeOK ? t('The screen stays on while a workout is running, so you don’t have to unlock your phone between sets.') : null}>
      <SelectRow icon="timer" iconTint="var(--orange)" title={t('Rest timer')}
        value={S.restSec} onChange={v => update(s => { s.restSec = v })}
        options={[30, 45, 60, 90, 120, 150, 180, 240, 300].map(v => ({ value: v, label: v + 's' }))} />
      <Row icon="timer" iconTint="var(--orange)" title={t('Rest timer presets')} subtitle={t('Quick-select buttons available during workouts')}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 220 }}>
          {[30, 45, 60, 90, 120, 150, 180, 240, 300].map(sec => {
            const presets = S.restPresets && S.restPresets.length ? S.restPresets : [60, 90, 120]
            const active = presets.includes(sec)
            return (
              <button
                key={sec}
                type="button"
                className={'chip' + (active ? ' acc' : '')}
                style={{
                  fontSize: 12,
                  padding: '4px 8px',
                  cursor: 'pointer',
                  borderRadius: 14,
                  fontWeight: active ? 600 : 400
                }}
                onClick={() => update(s => {
                  const curr = (s.restPresets && s.restPresets.length) ? [...s.restPresets] : [60, 90, 120]
                  if (curr.includes(sec)) {
                    if (curr.length > 1) {
                      s.restPresets = curr.filter(x => x !== sec).sort((a, b) => a - b)
                    }
                  } else {
                    s.restPresets = [...curr, sec].sort((a, b) => a - b)
                  }
                })}
              >
                {sec}s
              </button>
            )
          })}
        </div>
      </Row>
      {(wakeOK || !MOBILE) && (
        <Row icon="sun" iconTint="var(--yellow)" title={t('Keep screen awake')}
          subtitle={wakeOK ? null : t('Not supported in this browser.')}>
          <Switch checked={wakeOK && S.keepAwake !== false} disabled={!wakeOK}
            onChange={v => update(s => { s.keepAwake = v })} />
        </Row>
      )}
      <Row icon="bell" iconTint="var(--pink)" title={t('Sounds')} subtitle={t('Subtle chime when the rest timer reaches zero')}>
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          {S.sound && (
            <button
              type="button"
              className="chip"
              style={{ fontSize: 12, padding: '4px 10px', height: 28, cursor: 'pointer' }}
              onClick={() => playRestTimerAlert(true)}
              title={t('Preview timer sound')}
            >
              <Icon name="bell" size={13} style={{ marginRight: 4 }} />
              {t('Test')}
            </button>
          )}
          <Switch checked={!!S.sound} onChange={v => update(s => { s.sound = v })} />
        </div>
      </Row>
      <Row icon="vibrate" iconTint="var(--acc)" title={t('Haptic feedback')} subtitle={t('Vibrations for button taps, set completions, and rest timer')}>
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          {S.haptics !== false && (
            <button
              type="button"
              className="chip"
              style={{ fontSize: 12, padding: '4px 10px', height: 28, cursor: 'pointer' }}
              onClick={() => hapticSetComplete('set')}
              title={t('Preview haptic feedback')}
            >
              <Icon name="vibrate" size={13} style={{ marginRight: 4 }} />
              {t('Test')}
            </button>
          )}
          <Switch checked={S.haptics !== false} onChange={v => update(s => { s.haptics = v })} />
        </div>
      </Row>
      {/* Two names for the same judgement, so the column asks in the scale you already think in.
          The (i) sits before the control — you read it on the way to the choice, not after it. */}
      <Row icon="target" iconTint="var(--purple)" title={t('Effort per set')}>
        <button className="helpbtn" aria-label={t('What are RIR and RPE?')} onClick={effortHelpSheet}><Icon name="info" /></button>
        <Segmented className="seg-inline"
          options={[{ value: 'none', label: t('Off') }, { value: 'rir', label: t('RIR') }, { value: 'rpe', label: t('RPE') }]}
          value={effortOf(S)} onChange={v => update(s => { s.effort = v; delete s.showRir })} />
      </Row>
    </Section>

    {/* ---------- warmup & cooldown ---------- */}
    <Section title={t('Warm-up & Cooldown')} footer={t('Automatically added to the start and end of every workout.')}>
      <Row icon="bolt" iconTint="var(--orange)" title={t('Warm-up')} subtitle={t('Dynamic exercises before your workout')}>
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          {S.warmup !== false && (
            <button
              type="button"
              className="chip"
              style={{ fontSize: 12, padding: '4px 10px', height: 28, cursor: 'pointer' }}
              onClick={() => warmupCooldownSheet('warmup')}
              title={t('Configure warm-up')}
            >
              <Icon name="settings" size={13} style={{ marginRight: 4 }} />
              {t('Configure')}
            </button>
          )}
          <Switch checked={S.warmup !== false} onChange={v => update(s => { s.warmup = v })} />
        </div>
      </Row>
      <Row icon="heart" iconTint="var(--pink)" title={t('Cooldown')} subtitle={t('Static stretches after your workout')}>
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          {S.cooldown !== false && (
            <button
              type="button"
              className="chip"
              style={{ fontSize: 12, padding: '4px 10px', height: 28, cursor: 'pointer' }}
              onClick={() => warmupCooldownSheet('cooldown')}
              title={t('Configure cooldown')}
            >
              <Icon name="settings" size={13} style={{ marginRight: 4 }} />
              {t('Configure')}
            </button>
          )}
          <Switch checked={S.cooldown !== false} onChange={v => update(s => { s.cooldown = v })} />
        </div>
      </Row>
    </Section>

    {coachAvailable(config, user, { demo: DEMO, mobile: MOBILE }) && (
      <Section title={t('Coach')} footer={hasConsent(S)
        ? t('The Coach designs and adjusts your plan; it never changes anything without your say-so.')
        : t('An AI coach that can build your plan and adjust it from what you log. Off until you turn it on.')}>
        <Row icon="sparkles" iconTint="var(--acc)" title={hasConsent(S) ? t('Open the Coach') : t('Meet the Coach')}
          subtitle={hasConsent(S) ? t('Reviews, plan design, history and controls') : t('See what it would use, then decide')}
          accessory="chevron" onClick={() => nav('/coach')} />
      </Section>
    )}

    {(user || MOBILE) && <NotificationsCard S={S} update={update} toast={toast} />}

    {/* ---------- appearance ---------- */}
    <Section title={t('Appearance')} footer={t('Theme automatically adjusts based on sunrise, sunset, and device system time.')}>
      <Row icon="sun" iconTint="var(--gold, #ffd60a)" title={t('Theme Mode')}>
        <Segmented
          className="seg-inline"
          options={[
            { value: 'auto', label: t('Auto (Sun)') },
            { value: 'system', label: t('System') },
            { value: 'dark', label: t('Dark') },
            { value: 'light', label: t('Light') }
          ]}
          value={themeMode}
          onChange={onThemeModeChange}
        />
      </Row>

      {themeMode === 'auto' && (
        <div className="theme-schedule-card">
          <div className="theme-schedule-head">
            <div className={`theme-schedule-icon ${isDay ? 'day' : 'night'}`}>
              <Icon name={isDay ? 'sun' : 'moon'} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="theme-schedule-title">
                {isDay ? t('Daytime — Light mode active') : t('Nighttime — Dark mode active')}
              </div>
              <div className="theme-schedule-sub">
                {t('Device time: {0} · Switches at sunrise & sunset', curTimeStr)}
              </div>
            </div>
          </div>

          <div className="theme-sun-inputs">
            <div className="theme-sun-input-box">
              <label className="theme-sun-label">
                <Icon name="sun" style={{ color: 'var(--gold, #ffd60a)', fontSize: 13 }} />
                <span>{t('Sunrise')}</span>
              </label>
              <input
                type="time"
                className="theme-sun-time"
                value={themeCfg.sunrise || '07:00'}
                onChange={e => onSunriseChange(e.target.value)}
              />
            </div>
            <div className="theme-sun-input-box">
              <label className="theme-sun-label">
                <Icon name="moon" style={{ color: 'var(--indigo, #5e5ce6)', fontSize: 13 }} />
                <span>{t('Sunset')}</span>
              </label>
              <input
                type="time"
                className="theme-sun-time"
                value={themeCfg.sunset || '20:00'}
                onChange={e => onSunsetChange(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <Button
              size="sm"
              variant="tinted"
              icon="sparkles"
              onClick={detectSolarTimes}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {t('Detect local sunrise & sunset')}
            </Button>
          </div>
        </div>
      )}

      {themeMode === 'system' && (
        <div className="small muted" style={{ padding: '6px 14px 10px', lineHeight: 1.4 }}>
          {t('Follows device system dark mode settings. If your phone has an automatic sunset-to-sunrise schedule enabled, Gymly will match it.')}
        </div>
      )}

      {/* Purely how the muscle map is drawn — nothing else in the app reads this. */}
      <Row icon="figureStrength" iconTint="var(--teal)" title={t('Body diagram')}>
        <Segmented
          className="seg-inline"
          options={[{ value: 'male', label: t('Male') }, { value: 'female', label: t('Female') }]}
          value={S.body === 'female' ? 'female' : 'male'}
          onChange={v => update(s => { s.body = v })}
        />
      </Row>
      <div className="lrow" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12, paddingTop: 13, paddingBottom: 14 }}>
        <span className="lrow-t">{t('Accent color')}</span>
        <div className="swatches">
          {Object.entries(ACCENTS).map(([k, c]) => (
            <button key={k} className={'swatch' + ((S.accent || 'lime') === k ? ' on' : '')}
              style={{ background: c }} onClick={() => update(s => { s.accent = k })} aria-label={k} />
          ))}
        </div>
      </div>
    </Section>

    {/* ---------- google health integration ---------- */}
    <Section title={t('Google Health')}>
      <Row icon="heart" iconTint="#4285F4" title={t('Google Health')}
        subtitle={S.googleHealth?.connected ? `${t('Connected')} (${S.googleHealth?.email || ''})` : t('Sync workouts and body weight with Google Health')}
        accessory="chevron" onClick={googleHealthSheet} />
    </Section>

    {/* ---------- data: fill it, bring things over, back it up, wipe it ---------- */}
    <Section title={t('Data')}>
      <Row icon="sparkles" iconTint="var(--acc)" title={t('Ready-made programs')} accessory="chevron" onClick={programWizardSheet} />
      <Row icon="globe" iconTint="#6366f1" title={t('Import program from URL')}
        subtitle={t('athlete.ru, web links, or powerlifting cycles')}
        accessory="chevron" onClick={() => importUrlSheet()} />
      <Row icon="shuffle" iconTint="var(--teal)" title={t('Import from another app')}
        subtitle={t('Google Fit, FitNotes, Strong, Hevy — or body weight from Apple Health')}
        accessory="chevron" onClick={() => importRef.current.click()} />
      <Row icon="upload" iconTint="var(--blue)" title={t('Import backup')} accessory="chevron" onClick={() => fileRef.current.click()} />
      <Row
        icon="download"
        iconTint="var(--blue)"
        title={t('Export backup (JSON)')}
        subtitle={S.lastBackupAt ? t('Last export: {0}', fmtDateFromTs(S.lastBackupAt)) : (MOBILE ? t('Never exported') : null)}
        accessory="chevron"
        onClick={doExport}
      />
      {/* Also drops anything the Coach is holding server-side: a wipe that leaves a pending
          proposal on the server behind would be a wipe in name only. */}
      <Row icon="trash" iconTint="var(--red)" title={t('Reset everything')} danger onClick={() => confirmSheet({ title: t('Reset everything?'), message: t('Deletes your plan, workouts and body weight on this device. This cannot be undone.'), confirmText: t('Delete everything'), danger: true, onConfirm: () => { if (user) forgetCoach().catch(() => {}); replaceState(JSON.parse(JSON.stringify(DEF)), true); nav('/home'); toast(t('All data reset')) } })} />
    </Section>
    <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={doImport} />
    {/* Reset after reading so picking the same file twice still fires onChange. */}
    <input ref={importRef} type="file" accept=".csv,.xml,text/csv,text/xml" style={{ display: 'none' }}
      onChange={ev => { const f = ev.target.files[0]; if (f) importFromApp(f); ev.target.value = '' }} />

    {/* "Add to Home screen" makes no sense inside the native app */}
    {!MOBILE && <Section title={t('Tip')}>
      <Row icon="lightbulb" iconTint="var(--yellow)"
        title={IS_ANDROID ? t('In Chrome: ⋮ menu → Add to Home screen') : t('In Safari: Share → Add to Home Screen')}
        subtitle={t('to install Gymly as a full-screen app.') + ' ' + (user ? t('Your data syncs with your profile — sign in anywhere to see it.') : t('Guest data stays on this device — export a backup now and then!'))} />
    </Section>}

    <div className="dim small" style={{ textAlign: 'center', marginTop: 4, lineHeight: 1.6 }}>
      Gymly · {t('free & open source (AGPL v3)')}<br />
      <a href="https://github.com/DuarteSantos8/Gymly" target="_blank" rel="noopener">source code</a> · exercise data: hasaneyldrm/exercises-dataset (CC)
    </div>
  </div>
}

// The whole point is that the two scales are one judgement counted from opposite ends, and a
// paragraph is a bad way to say that — the conversion table shows it in one look. Reading down
// a column is the answer to "what do I put here", so the numbers get their own aligned columns.
const EFFORT_ROWS = [
  ['0', '10', 'Nothing left — went to failure'],
  ['1', '9', 'One more rep in the tank'],
  ['2', '8', 'Two more reps'],
  ['3', '7', 'Three more reps'],
  ['4+', '≤6', 'Easy — warm-up territory'],
]
// RIR 2 / RPE 8: the row a working set usually lands on — the anchor the others are read
// against. Not where the stepper starts; + walks up from the bottom of the scale.
const EFFORT_TYPICAL = 2

function effortHelpSheet() {
  useUI.getState().openSheet(close => <>
    <h3>{t('Effort per set')}</h3>
    <div className="muted small" style={{ lineHeight: 1.5 }}>
      {t('How hard a set was, logged next to weight and reps. Two scales for the same judgement, counted from opposite ends.')}
    </div>
    <div className="efftbl">
      <div className="r hd"><span className="n">{t('RIR')}</span><span className="n">{t('RPE')}</span><span className="f">{t('How it felt')}</span></div>
      {EFFORT_ROWS.map(([rir, rpe, feel], i) => (
        <div key={rir} className={'r' + (i === EFFORT_TYPICAL ? ' on' : '')}>
          <span className="n">{rir}</span><span className="n">{rpe}</span><span className="f">{t(feel)}</span>
        </div>
      ))}
    </div>
    <div className="dim small" style={{ lineHeight: 1.5, display: 'grid', gap: 8 }}>
      <div>{t('RIR counts the reps you left; RPE reads the same effort off a 10-point scale — so RPE ≈ 10 − RIR. Pick the one you already think in.')}</div>
      <div>{t('The highlighted row is where most working sets land. Sets you have already logged keep their own scale, and nothing else reads the value — progression and estimated 1RM are unaffected.')}</div>
    </div>
    <div style={{ height: 8 }} />
  </>)
}

function NotificationsCard({ S, update, toast }) {
  if (MOBILE) return <MobileReminderCard S={S} update={update} toast={toast} />
  return <PushCard S={S} update={update} toast={toast} />
}

// Mobile build: the reminder is a native local notification scheduled on planned weekdays —
// no push server involved. The schedule itself is (re)synced by the store on every persist;
// this card only owns the OS permission prompt when the switch turns on.
function MobileReminderCard({ S, update, toast }) {
  const setReminder = patch => update(s => { s.reminder = { ...(s.reminder || DEF.reminder), ...patch, tz: localTZ() } })
  const toggle = async () => {
    const on = !S.reminder?.on
    if (on) {
      const ok = await syncReminder({ ...S, reminder: { ...(S.reminder || DEF.reminder), on: true } }, true)
      if (!ok) { toast(t('Could not change notification settings')); return }
    }
    setReminder({ on })
  }
  return (
    <Section title={t('Notifications')}
      footer={S.reminder?.on ? t('Reminds you at this time on days that have a routine planned.') : null}>
      <Row icon="calendar" iconTint="var(--orange)" title={t('Workout day reminder')}>
        <Switch checked={!!S.reminder?.on} onChange={toggle} />
      </Row>
      {S.reminder?.on && (
        <Row icon="clock" iconTint="var(--purple)" title={t('Reminder time')}>
          <input type="time" className="timef" value={S.reminder?.time || DEF.reminder.time}
            onChange={e => setReminder({ time: e.target.value })} />
        </Row>
      )}
    </Section>
  )
}

function PushCard({ S, update, toast }) {
  const [on, setOn] = useState(false)
  const [busy, setBusy] = useState(false)
  const supported = pushSupported()

  useEffect(() => {
    if (!supported) return
    navigator.serviceWorker.ready.then(reg => reg.pushManager.getSubscription()).then(sub => setOn(!!sub)).catch(() => {})
  }, [supported])

  const toggle = async v => {
    setBusy(true)
    try {
      if (!v) { await disablePush(); setOn(false); toast(t('Notifications off')) }
      else { await enablePush(); setOn(true); toast(t('Notifications on')) }
    } catch (e) { toast(e.message || t('Could not change notification settings')) }
    setBusy(false)
  }
  const test = async () => {
    try { await sendTestPush(); toast(t('Test sent — should arrive any second')) }
    catch (e) { toast(e.message || t('Test failed')) }
  }

  if (!supported) return (
    <Section title={t('Notifications')}>
      <Row icon="bellSlash" iconTint="var(--grey)" title={t('Not supported in this browser.')} />
    </Section>
  )

  return <>
    <Section
      title={t('Notifications')}
      footer={on && S.reminder?.on
        ? t("Only sent on days you have a routine planned and haven't logged a workout yet.") +
          (S.reminder?.tz ? ' ' + t('Timezone: {0} (auto-detected, updates if you travel).', S.reminder.tz) : '')
        : null}
    >
      <Row icon="bell" iconTint="var(--red)" title={t('Push notifications')} subtitle={t('Rest-timer alerts, even if Gymly is closed.')}>
        <Switch checked={on} disabled={busy} onChange={toggle} />
      </Row>
      {on && (
        <Row icon="calendar" iconTint="var(--orange)" title={t('Workout day reminder')}>
          <Switch checked={!!S.reminder?.on} onChange={() => update(s => { s.reminder = { ...(s.reminder || DEF.reminder), on: !s.reminder?.on, tz: localTZ() } })} />
        </Row>
      )}
      {on && S.reminder?.on && (
        <Row icon="clock" iconTint="var(--purple)" title={t('Reminder time')}>
          <input type="time" className="timef" value={S.reminder?.time || DEF.reminder.time}
            onChange={e => update(s => { s.reminder = { ...(s.reminder || DEF.reminder), time: e.target.value, tz: localTZ() } })} />
        </Row>
      )}
    </Section>
    {on && <div style={{ marginTop: -12, marginBottom: 22 }}><Button size="sm" icon="bell" onClick={test}>{t('Send test notification')}</Button></div>}
  </>
}

function RegisterInline({ close, setUser, pushState, pullState, toast }) {
  const nameRef = useRef(null)
  const go = async () => {
    const n = (nameRef.current.value || '').trim()
    if (!n) { toast(t('Enter a name')); return }
    try {
      const u = await passkeyRegister(n); setUser(u); close()
      if (hasData(useStore.getState().S)) { await pushState(); toast(t('Profile created — data moved into it')) }
      else { await pullState(); toast(t('Welcome, {0}', u.name)) }
    } catch (e) { if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') toast(e.message || t('Registration failed')) }
  }
  return <>
    <h3>{t('Create your profile')}</h3>
    <div className="muted small" style={{ marginBottom: 14 }}>{t('Pick a name, then confirm with your device.')}</div>
    <TextField ref={nameRef} placeholder={t('Your name')} maxLength={40} />
    <div style={{ height: 12 }} /><Button variant="primary" onClick={go}>{t('Create passkey')}</Button>
  </>
}

function BackupPromptCard({ S, onExport, onDismiss }) {
  const days = getDaysSinceLastBackup(S)
  const isOverdue = days !== null && days >= BACKUP_PROMPT_INTERVAL_DAYS

  return (
    <div
      className="card"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--acc-line, rgba(48,209,88,.38))',
        borderRadius: 'var(--r-card)',
        padding: '14px 16px',
        marginBottom: 16,
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 }}>
          <span
            className="lrow-i"
            style={{
              background: 'var(--acc)',
              color: 'var(--on-acc)',
              marginTop: 2,
              flexShrink: 0,
            }}
          >
            <Icon name="shield" />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--label)', letterSpacing: '-0.01em' }}>
              {t('Export backup recommended')}
            </div>
            <div style={{ fontSize: 13, color: 'var(--label-2)', marginTop: 4, lineHeight: 1.4 }}>
              {isOverdue
                ? t('Your last backup was {0} days ago. Export a fresh backup to protect your workout history.', days)
                : t('On mobile, your workouts live only on this phone. Export a backup now to keep your data safe.')}
            </div>
          </div>
        </div>
        <button
          className="iconbtn"
          style={{ width: 28, height: 28, color: 'var(--label-3)', flexShrink: 0, marginTop: -2 }}
          onClick={onDismiss}
          aria-label={t('Dismiss')}
          title={t('Remind later')}
        >
          <Icon name="xmark" />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center', marginTop: 12 }}>
        <Button
          size="sm"
          variant="plain"
          onClick={onDismiss}
          style={{ padding: '6px 12px', fontSize: 13, height: 32 }}
        >
          {t('Remind later')}
        </Button>
        <Button
          size="sm"
          variant="primary"
          icon="download"
          onClick={onExport}
          style={{ padding: '6px 14px', fontSize: 13, height: 32 }}
        >
          {t('Export now')}
        </Button>
      </div>
    </div>
  )
}

