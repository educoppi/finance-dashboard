import { Area, AreaChart, CartesianGrid, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { DailyPoint } from '../../utils/finance';
import { formatDayLabel } from '../../utils/date';
import { useCurrency } from '../../hooks/useCurrency';
import { AXIS_TICK, ChartCard, ChartEmpty, GRID_STROKE, TooltipBox } from './ChartCard';

interface PaceTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: DailyPoint }>;
  monthKey: string;
  cap: number | null;
}

function PaceTooltip({ active, payload, monthKey, cap }: PaceTooltipProps) {
  const { format } = useCurrency();
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  return (
    <TooltipBox>
      <div className="font-medium text-slate-300">
        {formatDayLabel(monthKey, p.day)}
      </div>
      <div className="mt-1 flex justify-between gap-4">
        <span className="text-slate-400">Cumulative</span>
        <span className="money text-slate-50">{format(p.cumulative)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-slate-400">That day</span>
        <span className="money text-rose-300">{format(p.daily)}</span>
      </div>
      {cap !== null && (
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">{p.cumulative > cap ? 'Over the cap' : 'Left to cap'}</span>
          <span className={`money ${p.cumulative > cap ? 'text-rose-400' : 'text-emerald-300'}`}>
            {format(Math.abs(cap - p.cumulative))}
          </span>
        </div>
      )}
    </TooltipBox>
  );
}

/** Rounds up to a "nice" value that splits into 4 bands (e.g. 6,480 -> 8,000). */
function niceCeil(v: number): number {
  if (v <= 0) return 100;
  const step = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10]) {
    if (m * step >= v) return m * step;
  }
  return 10 * step;
}

interface SpendingPaceChartProps {
  data: DailyPoint[];
  monthKey: string;
  spendingCap: number;
  hasIncome: boolean;
}

export function SpendingPaceChart({ data, monthKey, spendingCap, hasIncome }: SpendingPaceChartProps) {
  const { format, formatCompact } = useCurrency();
  const total = data[data.length - 1]?.cumulative ?? 0;
  const cap = hasIncome ? spendingCap : null;
  const crossing = cap !== null ? data.find((p) => p.cumulative > cap && p.daily > 0) : undefined;
  const yMax = niceCeil(Math.max(total, cap ?? 0) * 1.08);
  const over = cap !== null && total > cap;
  const stroke = over ? '#fb7185' : '#818cf8';

  return (
    <ChartCard
      title="Cumulative spending pace"
      subtitle={
        crossing ? (
          <span className="text-rose-400">Spending cap crossed on day {crossing.day}</span>
        ) : cap !== null ? (
          'Running total of expenses vs. spending cap'
        ) : (
          'Add income to show the spending cap line'
        )
      }
      className="lg:order-first lg:col-span-2 xl:order-none"
    >
      {total === 0 && cap === null ? (
        <ChartEmpty icon={<TrendingUp className="size-5" />} message="No activity this month to plot yet." />
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="paceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID_STROKE} vertical={false} />
              <XAxis
                dataKey="day"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={{ stroke: GRID_STROKE }}
                interval="preserveStartEnd"
                minTickGap={12}
              />
              <YAxis
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={64}
                domain={[0, yMax]}
                allowDecimals={false}
                tickCount={5}
                tickFormatter={(v: number) => formatCompact(v)}
              />
              <Tooltip
                content={<PaceTooltip monthKey={monthKey} cap={cap} />}
                cursor={{ stroke: '#475569', strokeDasharray: '3 3' }}
              />
              {cap !== null && (
                <ReferenceLine
                  y={Math.max(cap, 0)}
                  stroke="#fbbf24"
                  strokeDasharray="6 4"
                  strokeWidth={1.5}
                  ifOverflow="extendDomain"
                  label={{
                    value: `Cap ${format(cap)}`,
                    position: 'insideTopRight',
                    fill: '#fbbf24',
                    fontSize: 11,
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke={stroke}
                strokeWidth={2}
                fill="url(#paceFill)"
                animationDuration={500}
                activeDot={{ r: 4, strokeWidth: 0, fill: stroke }}
              />
              {crossing && (
                <ReferenceDot
                  x={crossing.day}
                  y={crossing.cumulative}
                  r={5}
                  fill="#f43f5e"
                  stroke="#0f172a"
                  strokeWidth={2}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
