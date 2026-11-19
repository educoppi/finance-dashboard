import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { ToastProvider } from './shared/hooks/useToast';
import { CurrencyProvider } from './shared/hooks/useCurrency';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found.');

createRoot(root).render(
  <StrictMode>
    <CurrencyProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </CurrencyProvider>
  </StrictMode>,
);
