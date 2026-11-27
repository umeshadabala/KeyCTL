import { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ACTIVITY_DATA_24H, ACTIVITY_DATA_7D } from '../../data/mockDashboardData';
import { cn } from '../../lib/cn';
import { SectionHeader } from '../ui/SectionHeader';
import { StatusBadge } from '../ui/StatusBadge';

interface ActivityChartProps {
  range: '24h' | '7d';
  onRangeChange: (range: '24h' | '7d') => void;
  loading?: boolean;
}

type SeriesKey = 'authentication' | 'access' | 'keyEvents' | 'revocations';

interface SeriesConfig {
  key: SeriesKey;
  label: string;
  color: string;
  dash?: string;
}

const SERIES: SeriesConfig[] = [
  { key: 'access', label: 'Access', color: '#F4F4F5' },
  { key: 'authentication', label: 'Authentication', color: '#A1A1AA' },
  { key: 'keyEvents', label: 'Key events', color: '#71717A', dash: '4 3' },
  { key: 'revocations', label: 'Revocations', color: '#52525B', dash: '2 2' },
];

export function ActivityChart({ range, onRangeChange, loading = false }: ActivityChartProps) {
  const [visibleSeries, setVisibleSeries] = useState<Record<SeriesKey, boolean>>({
    authentication: true,
    access: true,
    keyEvents: true,
    revocations: true,
  });

  const data = range === '24h' ? ACTIVITY_DATA_24H : ACTIVITY_DATA_7D;

  const toggleSeries = (key: SeriesKey) => {
    setVisibleSeries((prev) => {
      const enabledCount = Object.values(prev).filter(Boolean).length;
      if (enabledCount === 1 && prev[key]) return prev;
      return { ...prev, [key]: !prev[key] };
    });
  };

  return (
    <section className="rounded-md border border-[#27272A] bg-[#141517] p-4 sm:p-5">
      <SectionHeader
        title="Security Activity"
        subtitle="Event volume across authentication, access checks, key operations, and revocations."
        badge={<StatusBadge tone="neutral">Synthetic sample data</StatusBadge>}
        actions={
          <div
            role="group"
            aria-label="Chart timeframe"
            className="inline-flex rounded border border-[#27272A] bg-[#090A0B] p-0.5"
          >
            {(['24h', '7d'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onRangeChange(option)}
                className={cn(
                  'rounded-sm px-2.5 py-1 font-mono text-[11px] font-medium transition-colors',
                  range === option
                    ? 'bg-[#19191C] text-[#F4F4F5]'
                    : 'text-[#71717A] hover:text-[#A1A1AA]',
                )}
              >
                {option.toUpperCase()}
              </button>
            ))}
          </div>
        }
      />

      {/* Interactive grayscale legend */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {SERIES.map((series) => {
          const active = visibleSeries[series.key];
          return (
            <button
              key={series.key}
              type="button"
              onClick={() => toggleSeries(series.key)}
              aria-pressed={active}
              className={cn(
                'inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] font-medium transition-colors',
                active
                  ? 'border-[#27272A] bg-[#19191C] text-[#F4F4F5]'
                  : 'border-[#27272A]/60 bg-transparent text-[#71717A] hover:text-[#A1A1AA]',
              )}
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full transition-opacity"
                style={{
                  backgroundColor: series.color,
                  opacity: active ? 1 : 0.25,
                }}
              />
              {series.label}
            </button>
          );
        })}
      </div>

      {/* Chart body */}
      <div className="mt-4 h-64 w-full">
        {loading ? (
          <div className="flex h-full w-full items-end gap-2 rounded border border-[#27272A] bg-[#090A0B] p-4">
            {[38, 52, 44, 70, 62, 85, 74, 92, 65, 54, 48, 60].map((h, i) => (
              <div
                key={i}
                className="flex-1 animate-pulse rounded-t bg-[#27272A]"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="mono-area-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F4F4F5" stopOpacity={0.07} />
                  <stop offset="95%" stopColor="#F4F4F5" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#27272A" strokeDasharray="3 3" strokeOpacity={0.55} vertical={false} />
              <XAxis
                dataKey="timeLabel"
                stroke="#27272A"
                tick={{ fill: '#71717A', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                tickLine={false}
                axisLine={{ stroke: '#27272A' }}
              />
              <YAxis
                stroke="#27272A"
                tick={{ fill: '#71717A', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                tickLine={false}
                axisLine={false}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: '#19191C',
                  borderColor: '#27272A',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#F4F4F5',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                }}
                labelStyle={{
                  color: '#A1A1AA',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  marginBottom: '4px',
                }}
              />
              {SERIES.map(
                (series) =>
                  visibleSeries[series.key] && (
                    <Area
                      key={series.key}
                      type="monotone"
                      dataKey={series.key}
                      name={series.label}
                      stroke={series.color}
                      strokeWidth={1.5}
                      strokeDasharray={series.dash}
                      fill={series.key === 'access' ? 'url(#mono-area-fill)' : 'transparent'}
                      activeDot={{ r: 3.5, strokeWidth: 0, fill: series.color }}
                    />
                  ),
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
