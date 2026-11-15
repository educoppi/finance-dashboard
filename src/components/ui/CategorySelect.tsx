import { forwardRef, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { Category } from '../../types/finance';

interface CategorySelectProps {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  /** Item extra no topo (ex: "Todas as categorias" nos filtros). */
  allOption?: { value: string; label: string };
  className?: string;
  id?: string;
  'aria-label'?: string;
}

/** Select customizado (listbox acessível) com bolinha de cor da categoria. */
export const CategorySelect = forwardRef<HTMLButtonElement, CategorySelectProps>(function CategorySelect(
  { categories, value, onChange, placeholder = 'Selecione', allOption, className = '', id, ...aria },
  ref,
) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const options = useMemo(
    () => [
      ...(allOption ? [{ value: allOption.value, label: allOption.label, color: null as string | null }] : []),
      ...categories.map((c) => ({ value: c.id, label: c.name, color: c.color as string | null })),
    ],
    [categories, allOption],
  );
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const openList = () => {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };

  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', ' '].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      // Enter fechado: deixa propagar para submeter o formulário.
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive((i) => Math.min(options.length - 1, i + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        break;
      case 'Enter':
      case ' ': {
        e.preventDefault();
        const opt = options[active];
        if (opt) choose(opt.value);
        break;
      }
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={ref}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        {...aria}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className="field flex items-center gap-2 text-left"
      >
        {selected?.color && (
          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: selected.color }} />
        )}
        <span className={`flex-1 truncate ${selected ? 'text-slate-100' : 'text-slate-500'}`}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className={`size-4 shrink-0 text-slate-500 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="fade-in absolute z-30 mt-1 max-h-64 w-full min-w-48 overflow-auto rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-xl shadow-black/50"
        >
          {options.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">Nenhuma categoria</li>}
          {options.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(o.value)}
              className={`flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm ${
                i === active ? 'bg-slate-800 text-slate-100' : 'text-slate-300'
              }`}
            >
              {o.color ? (
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: o.color }} />
              ) : (
                <span className="size-2.5 shrink-0 rounded-full border border-slate-600" />
              )}
              <span className="flex-1 truncate">{o.label}</span>
              {o.value === value && <Check className="size-4 text-indigo-400" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
