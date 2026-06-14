import React from 'react';

// Catches uncaught render errors so one broken view doesn't blank the whole app.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Uncaught render error:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ maxWidth: '560px', margin: '80px auto', padding: '24px', textAlign: 'center', fontFamily: 'var(--font-sans)' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Something went wrong</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          A rendering error crashed this view. Reloading usually fixes it.
        </p>
        <pre style={{ textAlign: 'left', fontSize: '11px', color: 'var(--text-error)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '12px', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {String(this.state.error?.stack || this.state.error)}
        </pre>
        <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    );
  }
}
