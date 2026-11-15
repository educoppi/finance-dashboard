import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { maskCurrencyInput } from '../../utils/money';

interface CurrencyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: string;
  onValueChange: (masked: string) => void;
}

/** Input com máscara monetária pt-BR (digitação em centavos). */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(function CurrencyInput(
  { value, onValueChange, className = '', ...rest },
  ref,
) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-slate-500">R$</span>
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="0,00"
        value={value}
        onChange={(e) => onValueChange(maskCurrencyInput(e.target.value))}
        className={`field money pl-9 text-right ${className}`}
        {...rest}
      />
    </div>
  );
});
