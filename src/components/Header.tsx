import { CalendarDays, ChevronLeft, ChevronRight, Tags, Wallet } from 'lucide-react';
import { formatMonthLabel, getCurrentMonthKey, shiftMonthKey } from '../utils/date';

interface HeaderProps {
  monthKey: string;
  onMonthChange: (monthKey: string) => void;
  onOpenCategories: () => void;
}

export function Header({ monthKey, onMonthChange, onOpenCategories }: HeaderProps) {
  const current = getCurrentMonthKey();
  const isCurrent = monthKey === current;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
            <Wallet className="size-4 text-white" />
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-semibold text-slate-100">Fluxo</p>
            <p className="text-[11px] text-slate-500">Finanças pessoais</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {!isCurrent && (
            <button
              type="button"
              onClick={() => onMonthChange(current)}
              className="hidden h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-indigo-300 transition hover:bg-indigo-500/10 md:inline-flex"
            >
              <CalendarDays className="size-3.5" />
              Mês atual
            </button>
          )}

          <div className="flex h-9 items-center rounded-lg border border-slate-800 bg-slate-900">
            <button
              type="button"
              onClick={() => onMonthChange(shiftMonthKey(monthKey, -1))}
              className="flex h-full w-9 items-center justify-center rounded-l-lg text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => onMonthChange(current)}
              title="Voltar para o mês atual"
              className="min-w-[8.5rem] px-2 text-center text-sm font-medium text-slate-100 tabular-nums sm:min-w-[10rem]"
              aria-live="polite"
            >
              {formatMonthLabel(monthKey)}
            </button>
            <button
              type="button"
              onClick={() => onMonthChange(shiftMonthKey(monthKey, 1))}
              className="flex h-full w-9 items-center justify-center rounded-r-lg text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
              aria-label="Próximo mês"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <button type="button" onClick={onOpenCategories} className="btn-ghost h-9" aria-label="Categorias">
            <Tags className="size-4" />
            <span className="hidden sm:inline">Categorias</span>
          </button>
        </div>
      </div>
    </header>
  );
}
