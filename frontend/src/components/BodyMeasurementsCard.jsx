import React, { useState } from 'react';
import { useStore } from '../store/useStore.js';
import { Button, Segmented, SelectRow } from './ui.jsx';
import { t } from '../lib/i18n.js';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { fmtDate } from '../lib/format.js';

export default function BodyMeasurementsCard({ S }) {
  const update = useStore(s => s.update);
  const [metric, setMetric] = useState('waist');

  const metrics = [
    { value: 'waist', label: t('Waist') },
    { value: 'bicep', label: t('Bicep') },
    { value: 'bodyfat', label: t('Body Fat %') }
  ];

  const logMeasurement = () => {
    const label = metrics.find(m => m.value === metric).label;
    const val = prompt(t('Enter new measurement for') + ' ' + label);
    if (val && !isNaN(parseFloat(val))) {
      update(s => {
        if (!s.measurements) s.measurements = [];
        s.measurements.push({
          d: new Date().toISOString(),
          type: metric,
          value: parseFloat(val)
        });
      });
    }
  };

  const data = (S.measurements || [])
    .filter(m => m.type === metric)
    .sort((a, b) => new Date(a.d) - new Date(b.d))
    .map(m => ({
      name: fmtDate(m.d, true),
      value: m.value
    }));

  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>{t('Body Measurements')}</h2>
        <Button size="sm" icon="plus" onClick={logMeasurement}>{t('Log')}</Button>
      </div>
      
      <Segmented 
        className="seg-range" 
        value={metric} 
        onChange={setMetric} 
        options={metrics} 
      />
      
      <div className="chart" style={{ height: 200, marginTop: 20 }}>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="name" stroke="var(--dim)" fontSize={12} tickMargin={10} />
              <YAxis domain={['auto', 'auto']} stroke="var(--dim)" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--bg2)', borderColor: 'var(--sep)', color: 'var(--fg)' }} 
                itemStyle={{ color: 'var(--acc)' }}
              />
              <Line type="monotone" dataKey="value" stroke="var(--acc)" strokeWidth={3} dot={{ r: 4, fill: 'var(--acc)' }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="muted small" style={{ textAlign: 'center', paddingTop: 80 }}>
            {t('No measurements logged yet.')}
          </div>
        )}
      </div>
    </div>
  );
}
