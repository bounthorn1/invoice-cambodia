import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/kantumruy-pro/khmer-400.css';
import '@fontsource/kantumruy-pro/khmer-600.css';
import './index.css';
import { App } from './App.tsx';
import { useLang } from './i18n/index.ts';

document.documentElement.lang = useLang.getState().lang;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
