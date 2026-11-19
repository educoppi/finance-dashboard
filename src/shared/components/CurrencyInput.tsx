import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { useCurrency } from '../hooks/useCurrency';

interface CurrencyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: string;
  onValueChange: (masked: string) => void;
}

/** Money input masked in the active currency (typing fills the minor units first). */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(function CurrencyInput(
  { value, onValueChange, className = '', ...rest },
  ref,
) {
  const { symbol, mask, placeholder } = useCurrency();
  const padLeft = symbol.length > 2 ? 'pl-12' : symbol.length > 1 ? 'pl-10' : 'pl-8';
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-slate-500">{symbol}</span>
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onValueChange(mask(e.target.value))}
        className={`field money ${padLeft} text-right ${className}`}
        {...rest}
      />
    </div>
  );
});
