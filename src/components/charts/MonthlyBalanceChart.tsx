import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3 } from 'lucide-react';
import type { MonthSummary } from '../../types/finance';
import { formatBRL, formatBRLCompact } from '../../utils/money';
import { AXIS_TICK, ChartCard, ChartEmpty, GRID_STROKE, TooltipBox } from './ChartCard';

interface BarDatum {
  name: string;
  value: number;
  color: string;
}

interface BalanceTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: BarDatum }>;
  income: number;
}

function BalanceTooltip({ active, payload, income }: BalanceTooltipProps) {
  const d = payload?.[0]?.payload;
  if (!active || !d) return null;
  return (
    <TooltipBox>
      <div className="flex items-center gap-2 font-medium text-slate-300">
        <span className="size-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
        {d.name}
      </div>
      <div className="money mt-1 text-sm text-slate-50">{formatBRL(d.value)}</div>
      {income > 0 && d.name !== 'Receitas' && (
        <div className="text-slate-400">
          {((d.value / income) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% das receitas
        </div>
      )}
    </TooltipBox>
  );
}

export function MonthlyBalanceChart({ summary }: { summary: MonthSummary }) {
  const data: BarDatum[] = [
    { name: 'Receitas', value: summary.income, color: '#34d399' },
    { name: 'Gastos', value: summary.expense, color: '#fb7185' },
    { name: 'Meta', value: summary.goal, color: '#818cf8' },
  ];
  const empty = data.every((d) => d.value === 0);

  return (
    <ChartCard title="Balanço mensal" subtitle="Receitas, gastos e meta reservada">
      {empty ? (
        <ChartEmpty icon={<BarChart3 className="size-5" />} message="Lance movimentações ou defina uma meta para comparar." />
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 24, right: 8, left: 0, bottom: 0 }} barCategoryGap="22%">
              <CartesianGrid stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_STROKE }} />
              <YAxis
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={64}
                tickFormatter={(v: number) => formatBRLCompact(v)}
              />
              <Tooltip content={<BalanceTooltip income={summary.income} />} cursor={{ fill: 'rgb(148 163 184 / 0.06)' }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} animationDuration={500} maxBarSize={64}>
                {data.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
                <LabelList
                  dataKey="value"
                  position="top"
                  formatter={(v: unknown) => (typeof v === 'number' && v > 0 ? formatBRLCompact(v) : '')}
                  style={{ fill: '#cbd5e1', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
