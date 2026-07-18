'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches theme component render exceptions that escape ThemeManager's
 * try/catch (which only wraps element construction, not React render).
 */
export default class ThemeRenderBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[themeEngine] ThemeRenderBoundary caught:', error);
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div
            style={{
              padding: 24,
              fontFamily: 'system-ui, sans-serif',
              color: '#7f1d1d',
              background: '#fef2f2',
            }}
          >
            <strong>Theme render failed.</strong>
            <p style={{ marginTop: 8, fontSize: 14 }}>{this.state.error.message}</p>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
