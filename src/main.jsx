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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
