import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import type { CategorySlice } from '../../utils/finance';
import { useCurrency } from '../../hooks/useCurrency';
import { ChartCard, ChartEmpty, TooltipBox } from './ChartCard';

const pct = (v: number) => `${(v * 100).toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;

interface DonutTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: CategorySlice }>;
}

function DonutTooltip({ active, payload }: DonutTooltipProps) {
  const { format } = useCurrency();
  const slice = payload?.[0]?.payload;
  if (!active || !slice) return null;
  return (
    <TooltipBox>
      <div className="flex items-center gap-2 font-medium text-slate-200">
        <span className="size-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
        {slice.name}
      </div>
      <div className="money mt-1 text-sm text-slate-50">{format(slice.value)}</div>
      <div className="text-slate-400">{pct(slice.percent)} of total</div>
    </TooltipBox>
  );
}

export function CategoryDonut({ data, total }: { data: CategorySlice[]; total: number }) {
  const { format } = useCurrency();
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const active = activeIdx !== null ? data[activeIdx] : undefined;

  return (
    <ChartCard title="Spending by category" subtitle="How this month's expenses are split">
      {data.length === 0 ? (
        <ChartEmpty icon={<PieIcon className="size-5" />} message="No expenses logged this month yet." />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="relative h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="62%"
                  outerRadius="92%"
                  paddingAngle={data.length > 1 ? 2 : 0}
                  stroke="none"
                  isAnimationActive
                  animationDuration={500}
                  onMouseEnter={(_, i) => setActiveIdx(i)}
                  onMouseLeave={() => setActiveIdx(null)}
                >
                  {data.map((s, i) => (
                    <Cell
                      key={s.categoryId}
                      fill={s.color}
                      opacity={activeIdx === null || activeIdx === i ? 1 : 0.35}
                      style={{ transition: 'opacity 150ms' }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<DonutTooltip />} wrapperStyle={{ zIndex: 10 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="max-w-[45%] truncate text-[11px] text-slate-500">{active ? active.name : 'Total'}</span>
              <span className="money max-w-[55%] truncate text-base font-semibold text-slate-50">
                {format(active ? active.value : total)}
              </span>
              {active && <span className="text-[11px] text-slate-400">{pct(active.percent)}</span>}
            </div>
          </div>
          <ul className="grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
            {data.slice(0, 6).map((s, i) => (
              <li
                key={s.categoryId}
                className="flex items-center gap-2 rounded-md px-1.5 py-1 transition hover:bg-slate-800/60"
                onMouseEnter={() => setActiveIdx(i)}
                onMouseLeave={() => setActiveIdx(null)}
              >
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="flex-1 truncate text-slate-300">{s.name}</span>
                <span className="money text-slate-400">{pct(s.percent)}</span>
              </li>
            ))}
            {data.length > 6 && <li className="px-1.5 py-1 text-slate-500">+{data.length - 6} more categories</li>}
          </ul>
        </div>
      )}
    </ChartCard>
  );
}
