import { describe, it, expect } from 'vitest';
import { pluginManager as tm } from '../src/lib/plugin-loader';

describe('theme-manager', () => {
  it('registers built-in themes with valid shape', () => {
    const themes = tm.getAllThemes();
    expect(themes.length).toBeGreaterThanOrEqual(8);
    for (const t of themes) {
      expect(typeof t.id).toBe('string');
      expect(typeof t.name).toBe('string');
      const hasFlatPrimary = t.variables && t.variables['--primary'];
      const hasNestedPrimary = t.variables && t.variables.dark && t.variables.dark['--primary'];
      expect(hasFlatPrimary || hasNestedPrimary).toBeTruthy();
    }
  });

  it('ships os-windows-11-dark as the first theme', () => {
    expect(tm.getAllThemes()[0].id).toBe('os-windows-11-dark');
  });

  it('looks up by id', () => {
    expect(tm.getTheme('os-macos-dark').id).toBe('os-macos-dark');
    expect(tm.getTheme('nope')).toBeNull();
  });

  it('rejects an unreadable theme file', () => {
    const res = tm.loadThemeFile('/path/does/not/exist.js');
    expect(res.success).toBe(false);
    expect(res.error).toBeTruthy();
  });
});
