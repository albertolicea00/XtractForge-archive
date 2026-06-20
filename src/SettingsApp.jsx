import React, { useState, useEffect, useCallback } from 'react';
import { makeT } from './i18n';
import { applyTheme } from './lib/theme';
import SettingsTab from './components/tabs/SettingsTab';

export default function SettingsApp() {
  const [settings, setSettings] = useState({
    ytdlpPath: 'yt-dlp',
    ffmpegPath: 'ffmpeg',
    downloadFolder: '',
    speedLimit: '',
    embedSubtitles: false,
    sponsorBlock: false,
    stageToTemp: true,
    organize: 'none',
    themeMode: 'auto',
    useNativeTitlebar: false,
    useSystemAccentColor: true,
    osDarkMode: false,
    osAccentColor: null,
    runInBackground: false,
    trayFormatMode: 'default',
    trayCustomTemplate: '{status}: {percent}% ({active} active)',
    showTrayTitle: true,
    maxConcurrentDownloads: '2',
  });

  const [language, setLanguage] = useState(() => {
    try { return localStorage.getItem('xf-lang') || 'en'; } catch { return 'en'; }
  });
  const [appVersion, setAppVersion] = useState('');
  const [autoCheckUpdates, setAutoCheckUpdates] = useState(true);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [savedFlash, setSavedFlash] = useState(null);

  const [themes, setThemes] = useState([]);
  const [activeThemeId, setActiveThemeId] = useState('xtractforge-default');
  const [themeSettings, setThemeSettings] = useState({ accentOverride: '#34d399', glassIntensity: 75, monoFont: true, fontFamily: '', fontScale: 100, fontWeight: 'normal', letterSpacing: 0 });

  const t = makeT(language);

  const refreshSettings = useCallback(async () => {
    try {
      const saved = await window.api.getSettings();
      if (saved) {
        setSettings(prev => ({
          ...prev,
          downloadFolder: saved.downloadFolder || prev.downloadFolder,
          speedLimit: saved.speedLimit || '',
          embedSubtitles: !!saved.embedSubtitles,
          sponsorBlock: !!saved.sponsorBlock,
          stageToTemp: saved.stageToTemp !== false,
          organize: saved.organize || 'none',
          themeMode: saved.themeMode || 'auto',
          useNativeTitlebar: !!saved.useNativeTitlebar,
          useSystemAccentColor: saved.useSystemAccentColor !== false,
          osDarkMode: !!saved.osDarkMode,
          osAccentColor: saved.osAccentColor || null,
          runInBackground: !!saved.runInBackground,
          trayFormatMode: saved.trayFormatMode || 'default',
          trayCustomTemplate: saved.trayCustomTemplate || '{status}: {percent}% ({active} active)',
          showTrayTitle: saved.showTrayTitle !== false,
          maxConcurrentDownloads: saved.maxConcurrentDownloads || '2',
        }));
        if (typeof saved.autoCheckUpdates === 'boolean') setAutoCheckUpdates(saved.autoCheckUpdates);
        if (saved.language) {
          setLanguage(saved.language);
          try { localStorage.setItem('xf-lang', saved.language); } catch {}
        }
      }
      
      const [list, active] = await Promise.all([window.api.getThemes(), window.api.getActiveTheme()]);
      setThemes(list);
      setActiveThemeId(active.activeTheme || 'xtractforge-default');
      if (active.themeSettings) setThemeSettings(active.themeSettings);
    } catch (err) {
      console.error('Failed to load settings in settings window:', err);
    }
  }, []);

  useEffect(() => {
    refreshSettings();
    window.api.getAppVersion().then(setAppVersion).catch(() => {});

    // Sync state if settings are updated in another window
    const unsub = window.api.onSettingsChanged((updatedSettings) => {
      setSettings(prev => ({ ...prev, ...updatedSettings }));
      if (updatedSettings.language) {
        setLanguage(updatedSettings.language);
        try { localStorage.setItem('xf-lang', updatedSettings.language); } catch {}
      }
      if (typeof updatedSettings.autoCheckUpdates === 'boolean') {
        setAutoCheckUpdates(updatedSettings.autoCheckUpdates);
      }
    });

    // Also auto-trigger check for updates if requested from menu
    const unsubUpdateMenu = window.api.onCheckForUpdatesMenu?.(() => {
      handleCheckUpdates();
    });

    return () => {
      unsub();
      if (unsubUpdateMenu) unsubUpdateMenu();
    };
  }, [refreshSettings]);

  // Apply theme
  useEffect(() => {
    const theme = themes.find(th => th.id === activeThemeId);
    if (theme) {
      const mergedSettings = {
        ...themeSettings,
        themeMode: settings.themeMode,
        osDarkMode: settings.osDarkMode
      };
      if (settings.useSystemAccentColor && settings.osAccentColor) {
        mergedSettings.accentOverride = settings.osAccentColor;
      }
      applyTheme(theme, mergedSettings);
    }
  }, [themes, activeThemeId, themeSettings, settings.themeMode, settings.osDarkMode, settings.useSystemAccentColor, settings.osAccentColor]);

  // Handle native titlebar body class
  useEffect(() => {
    if (settings.useNativeTitlebar) {
      document.body.classList.add('native-titlebar');
    } else {
      document.body.classList.remove('native-titlebar');
    }
  }, [settings.useNativeTitlebar]);

  // Text size
  useEffect(() => {
    const scale = typeof themeSettings.fontScale === 'number' ? themeSettings.fontScale : 100;
    window.api.setZoomFactor?.(scale / 100);
  }, [themeSettings.fontScale]);

  const handleSelectFolder = async () => {
    const folder = await window.api.selectFolder();
    if (folder) {
      const patch = { downloadFolder: folder };
      setSettings(prev => ({ ...prev, ...patch }));
      await window.api.saveSettings(patch);
      window.api.emitSettingsChanged(patch);
      flashSaved();
    }
  };

  const updateSetting = async (patch) => {
    setSettings(prev => ({ ...prev, ...patch }));
    await window.api.saveSettings(patch);
    window.api.emitSettingsChanged(patch);
    flashSaved();
  };

  const handleSetLanguage = async (lang) => {
    setLanguage(lang);
    try { localStorage.setItem('xf-lang', lang); } catch {}
    await window.api.saveSettings({ language: lang });
    window.api.emitSettingsChanged({ language: lang });
    flashSaved();
  };

  const handleToggleAutoUpdates = async (val) => {
    setAutoCheckUpdates(val);
    await window.api.saveSettings({ autoCheckUpdates: val });
    window.api.emitSettingsChanged({ autoCheckUpdates: val });
  };

  const handleCheckUpdates = async () => {
    setCheckingUpdate(true);
    try {
      const r = await window.api.checkForUpdates();
      setUpdateInfo(r);
    } finally {
      setCheckingUpdate(false);
    }
  };

  const flashSaved = () => {
    setSavedFlash('global');
    setTimeout(() => setSavedFlash(null), 1600);
  };

  return (
    <div className="app-container" style={{ display: 'block', height: '100vh', overflowY: 'auto', padding: '32px' }}>
      <div className="titlebar-drag" style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '32px', zIndex: 1000 }}></div>
      <div className="bg-glow-1"></div>
      <div className="bg-glow-2"></div>
      
      <main className="main-content" style={{ padding: 0, maxWidth: '100%' }}>
        <SettingsTab
          t={t}
          savedFlash={savedFlash}
          settings={settings}
          handleSelectFolder={handleSelectFolder}
          updateSetting={updateSetting}
          language={language}
          handleSetLanguage={handleSetLanguage}
          appVersion={appVersion}
          autoCheckUpdates={autoCheckUpdates}
          handleToggleAutoUpdates={handleToggleAutoUpdates}
          handleCheckUpdates={handleCheckUpdates}
          checkingUpdate={checkingUpdate}
          updateInfo={updateInfo}
          setActiveTab={() => {}}
          setSelectedPlugin={() => {}}
          standalone={true}
        />
      </main>
    </div>
  );
}
