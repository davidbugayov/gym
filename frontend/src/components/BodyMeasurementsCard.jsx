import React, { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { Button, Segmented } from './ui.jsx'
import Icon from './Icon.jsx'
import { t } from '../lib/i18n.js'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { fmtDate, fmtNum, todayISO } from '../lib/format.js'

function LogMeasurementModal({ initialMetric = 'waist', close }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const [metric, setMetric] = useState(initialMetric)
  const [val, setVal] = useState('')
  const [date, setDate] = useState(() => todayISO())

  const isPercent = metric === 'bodyfat'
  const unitStr = isPercent ? '%' : (S.unit === 'lb' ? 'in' : 'cm')

  const metrics = [
    { value: 'waist', label: t('Waist') },
    { value: 'bicep', label: t('Bicep') },
    { value: 'bodyfat', label: t('Body Fat %') },
    { value: 'chest', label: t('Chest') },
    { value: 'hips', label: t('Hips') },
    { value: 'thigh', label: t('Thigh') }
  ]

  const currentLabel = metrics.find(m => m.value === metric)?.label || metric

  const handleSave = e => {
    e?.preventDefault()
    const parsed = parseFloat(val.replace(',', '.'))
    if (isNaN(parsed) || parsed <= 0) return

    update(s => {
      if (!s.measurements) s.measurements = []
      s.measurements.push({
        id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        d: date,
        type: metric,
        value: parsed
      })
    })

    useUI.getState().toast(t('Measurement saved'))
    close()
  }

  const handleDelete = id => {
    update(s => {
      s.measurements = (s.measurements || []).filter(m => m.id !== id && !(m.d === id))
    })
    useUI.getState().toast(t('Measurement deleted'))
  }

  // Recent logs for current metric
  const recentLogs = (S.measurements || [])
    .filter(m => m.type === metric)
    .sort((a, b) => new Date(b.d) - new Date(a.d))
    .slice(0, 5)

  return (
    <div style={{ textAlign: 'left', padding: '4px 0' }}>
      <h3 style={{ marginBottom: 12 }}>{t('Log Measurement')}</h3>

      <div style={{ marginBottom: 14 }}>
        <div className="small dim" style={{ marginBottom: 6, fontWeight: 600 }}>{t('Metric')}</div>
        <Segmented
          className="seg-range"
          value={metric}
          onChange={setMetric}
          options={metrics}
        />
      </div>

      <form onSubmit={handleSave}>
        <div style={{ marginBottom: 14 }}>
          <div className="small dim" style={{ marginBottom: 6, fontWeight: 600 }}>
            {currentLabel} ({unitStr})
          </div>
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <input
              type="number"
              step="0.1"
              min="1"
              max="400"
              autoFocus
              inputMode="decimal"
              placeholder={isPercent ? '15.5' : '80.0'}
              value={val}
              onChange={e => setVal(e.target.value)}
              style={{
                flex: 1,
                fontSize: 18,
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid var(--sep)',
                background: 'var(--surface-2)',
                color: 'var(--fg)'
              }}
            />
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--label-2)', minWidth: 32 }}>
              {unitStr}
            </span>
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div className="small dim" style={{ marginBottom: 6, fontWeight: 600 }}>{t('Date')}</div>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{
              width: '100%',
              fontSize: 15,
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid var(--sep)',
              background: 'var(--surface-2)',
              color: 'var(--fg)'
            }}
          />
        </div>

        <Button
          variant="primary"
          icon="check"
          type="submit"
          disabled={!val || isNaN(parseFloat(val.replace(',', '.')))}
          style={{ width: '100%', marginBottom: 10 }}
        >
          {t('Save')}
        </Button>

        <Button
          variant="ghost"
          className="dim"
          type="button"
          onClick={close}
          style={{ width: '100%' }}
        >
          {t('Cancel')}
        </Button>
      </form>

      {recentLogs.length > 0 && (
        <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--sep-op)' }}>
          <div className="small dim" style={{ marginBottom: 8, fontWeight: 600 }}>{t('Recent logs')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recentLogs.map((item, idx) => (
              <div
                key={item.id || item.d + idx}
                className="row between"
                style={{
                  padding: '6px 10px',
                  background: 'var(--surface-2)',
                  borderRadius: 8,
                  alignItems: 'center'
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{fmtNum(item.value)} {unitStr}</span>
                  <span className="small dim" style={{ marginLeft: 8 }}>{fmtDate(item.d, true)}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ padding: 4, color: 'var(--red)' }}
                  onClick={() => handleDelete(item.id || item.d)}
                  title={t('Delete')}
                >
                  <Icon name="trash" style={{ fontSize: 14 }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function BodyMeasurementsCard({ S }) {
  const [metric, setMetric] = useState('waist')

  const metrics = [
    { value: 'waist', label: t('Waist') },
    { value: 'bicep', label: t('Bicep') },
    { value: 'bodyfat', label: t('Body Fat %') }
  ]

  const isPercent = metric === 'bodyfat'
  const unitStr = isPercent ? '%' : (S.unit === 'lb' ? 'in' : 'cm')

  const openLogSheet = () => {
    useUI.getState().openSheet(close => (
      <LogMeasurementModal initialMetric={metric} close={close} />
    ))
  }

  const data = (S.measurements || [])
    .filter(m => m.type === metric)
    .sort((a, b) => new Date(a.d) - new Date(b.d))
    .map(m => ({
      name: fmtDate(m.d, true),
      value: m.value
    }))

  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 12, alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>{t('Body Measurements')}</h2>
        <Button
          size="sm"
          variant="tinted"
          icon="plus"
          onClick={openLogSheet}
          title={t('Log measurement')}
        >
          {t('Log')}
        </Button>
      </div>

      <Segmented
        className="seg-range"
        value={metric}
        onChange={setMetric}
        options={metrics}
      />

      <div className="chart" style={{ height: 200, marginTop: 16 }}>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="var(--dim)" fontSize={12} tickMargin={10} />
              <YAxis domain={['auto', 'auto']} stroke="var(--dim)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg2)',
                  borderColor: 'var(--sep)',
                  borderRadius: 8,
                  color: 'var(--fg)'
                }}
                formatter={val => [`${fmtNum(val)} ${unitStr}`, t('Value')]}
                itemStyle={{ color: 'var(--acc)', fontWeight: 600 }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--acc)"
                strokeWidth={3}
                dot={{ r: 4, fill: 'var(--acc)' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="muted small" style={{ textAlign: 'center', paddingTop: 40, paddingBottom: 20 }}>
            <div style={{ marginBottom: 10 }}>{t('No measurements logged yet.')}</div>
            <Button size="sm" variant="primary" icon="plus" onClick={openLogSheet}>
              {t('Log measurement')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
