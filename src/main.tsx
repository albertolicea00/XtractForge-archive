import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// Paint the previously chosen theme synchronously, before React mounts, so the
// app doesn't flash the default theme for a moment on every launch.
try {
  const cached = localStorage.getItem('xf-theme-css');
  if (cached) {
    const el = document.createElement('style');
    el.id = 'xf-theme';
    el.textContent = cached;
    document.head.appendChild(el);
  }
} catch {}

const initApp = async (): Promise<void> => {
  if (!window.api) {
    const { initTauriBridge } = await import('./lib/tauri-bridge');
    await initTauriBridge();
  }

  const rootEl = document.getElementById('root');
  if (rootEl) {
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
  }
};

initApp();
