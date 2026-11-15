import type { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ChartCard({ title, subtitle, children, className = '' }: ChartCardProps) {
  return (
    <div className={`card flex flex-col p-4 sm:p-5 ${className}`}>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

export function ChartEmpty({ icon, message }: { icon: ReactNode; message: string }) {
  return (
    <div className="flex h-full min-h-56 flex-col items-center justify-center gap-2 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-slate-800/80 text-slate-500">{icon}</div>
      <p className="max-w-52 text-xs text-slate-500">{message}</p>
    </div>
  );
}

/** Contêiner padrão do tooltip em dark mode. */
export function TooltipBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950/95 px-3 py-2 text-xs shadow-xl shadow-black/50 backdrop-blur">
      {children}
    </div>
  );
}

export const AXIS_TICK = { fill: '#64748b', fontSize: 11 } as const;
export const GRID_STROKE = '#1e293b';
