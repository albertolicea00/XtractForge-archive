import React, { useState, useEffect, useCallback, useRef } from 'react';
import { makeT } from './i18n';
import { getThumbnailUrl } from './lib/format';
import { applyTheme } from './lib/theme';
import Sidebar from './components/Sidebar';
import DownloadTab from './components/tabs/DownloadTab';
import QueueTab from './components/tabs/QueueTab';
import PluginsTab from './components/tabs/PluginsTab';
import ThemesTab from './components/tabs/ThemesTab';
import SettingsTab from './components/tabs/SettingsTab';

// ─── App ────────────────────────────────────────────────────────────────────

export default function App() {
  const [activeTab, setActiveTab] = useState('download');

  // Plugin registry: { [pluginId]: { available, version, name, description, type, icon, repoUrl, configSchema, isBuiltin } }
  const [pluginStatus, setPluginStatus] = useState({});
  const [disabledPlugins, setDisabledPlugins] = useState([]);
  const [checkingDeps, setCheckingDeps] = useState(true);

  // Downloader state
  const [url, setUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [videoInfo, setVideoInfo] = useState(null);
  const [detectedPlugin, setDetectedPlugin] = useState(null);
  // Which engine to extract with: 'auto' (let XtractForge pick) or a plugin id
  const [chosenEngine, setChosenEngine] = useState('auto');
  // Values for a plugin-declared download form (info._downloadOptions)
  const [pluginOpts, setPluginOpts] = useState({});

  // Format selection
  const [downloadType, setDownloadType] = useState('video');
  const [selectedResolution, setSelectedResolution] = useState('best');
  const [selectedAudioFormat, setSelectedAudioFormat] = useState('mp3');
  const [selectedCustomFormat, setSelectedCustomFormat] = useState('');

  // Download queue
  const [queue, setQueue] = useState([]);
  // Raw console output per download id: { [id]: string }
  const [logs, setLogs] = useState({});
  // Which queue items have their console output expanded
  const [expandedLogs, setExpandedLogs] = useState({});
  // Free disk space on the download volume (bytes), refreshed periodically
  const [diskFree, setDiskFree] = useState(null);

  // Global settings
  const [settings, setSettings] = useState({
    ytdlpPath: 'yt-dlp',
    ffmpegPath: 'ffmpeg',
    downloadFolder: '',
    speedLimit: '',
    embedSubtitles: false,
    sponsorBlock: false,
  });

  // Plugin-specific configs: { [pluginId]: { ...keys } }
  const [pluginConfigs, setPluginConfigs] = useState({});

  // Import plugin feedback
  const [importResult, setImportResult] = useState(null);
  // Tracks which plugin's install command was just copied (for "Copied!" feedback)
  const [copiedInstall, setCopiedInstall] = useState(null);
  // Which plugin's detail/settings page is open in the Plugins tab (null = card grid)
  const [selectedPlugin, setSelectedPlugin] = useState(null);
  // Transient "Saved" confirmation key (e.g. `plugin:yt-dlp`), cleared after a moment
  const [savedFlash, setSavedFlash] = useState(null);
  // Scroll container for the main content area
  const mainRef = useRef(null);

  // Language — lazy-init from localStorage so the first render uses the chosen
  // language (no English flash before the async settings hydrate).
  const [language, setLanguage] = useState(() => {
    try { return localStorage.getItem('xf-lang') || 'en'; } catch { return 'en'; }
  });
  const t = makeT(language);

  // Updates
  const [appVersion, setAppVersion] = useState('');
  const [autoCheckUpdates, setAutoCheckUpdates] = useState(true);
  const [updateInfo, setUpdateInfo] = useState(null);   // { current, latest, hasUpdate, url, error }
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  // Themes
  const [themes, setThemes] = useState([]);
  const [activeThemeId, setActiveThemeId] = useState('xtractforge-default');
  const [themeSettings, setThemeSettings] = useState({ accentOverride: '#34d399', glassIntensity: 75, monoFont: true, fontFamily: '', fontScale: 100, fontWeight: 'normal', letterSpacing: 0 });
  const [themeImportResult, setThemeImportResult] = useState(null);

  // ── Init ──────────────────────────────────────────────────────────────────

  const refreshPlugins = useCallback(async () => {
    setCheckingDeps(true);
    try {
      const status = await window.api.checkDependencies();
      setPluginStatus(status);
      const configs = await window.api.getPluginConfigs();
      setPluginConfigs(configs);
      // Hydrate persisted global settings + disabled plugins from config.json
      const saved = await window.api.getSettings();
      if (saved) {
        setSettings(prev => ({
          ...prev,
          downloadFolder: saved.downloadFolder || prev.downloadFolder,
          speedLimit: saved.speedLimit || '',
          embedSubtitles: !!saved.embedSubtitles,
          sponsorBlock: !!saved.sponsorBlock,
        }));
        setDisabledPlugins(saved.disabledPlugins || []);
        if (typeof saved.autoCheckUpdates === 'boolean') setAutoCheckUpdates(saved.autoCheckUpdates);
        if (saved.language) { setLanguage(saved.language); try { localStorage.setItem('xf-lang', saved.language); } catch {} }
      }
    } catch (err) {
      console.error('Failed to check dependencies:', err);
    } finally {
      setCheckingDeps(false);
    }
  }, []);

  const loadThemes = useCallback(async () => {
    try {
      // Resolve both before setting state so there's no intermediate render with
      // the default theme (which caused a brief flash on launch).
      const [list, active] = await Promise.all([window.api.getThemes(), window.api.getActiveTheme()]);
      setThemes(list);
      setActiveThemeId(active.activeTheme || 'xtractforge-default');
      if (active.themeSettings) setThemeSettings(active.themeSettings);
    } catch (err) {
      console.error('Failed to load themes:', err);
    }
  }, []);

  const handleCheckUpdates = useCallback(async () => {
    setCheckingUpdate(true);
    try {
      const r = await window.api.checkForUpdates();
      setUpdateInfo(r);
    } finally {
      setCheckingUpdate(false);
    }
  }, []);

  const handleToggleAutoUpdates = (val) => {
    setAutoCheckUpdates(val);
    window.api.saveSettings({ autoCheckUpdates: val });
  };

  const handleSetLanguage = (lang) => {
    setLanguage(lang);
    try { localStorage.setItem('xf-lang', lang); } catch {}
    window.api.saveSettings({ language: lang });
  };

  // Load version on mount, and auto-check for updates if enabled
  useEffect(() => {
    window.api.getAppVersion().then(setAppVersion).catch(() => {});
  }, []);

  useEffect(() => {
    if (autoCheckUpdates) handleCheckUpdates();
  }, [autoCheckUpdates, handleCheckUpdates]);

  useEffect(() => {
    refreshPlugins();
    loadThemes();

    const unsub1 = window.api.onDownloadProgress((data) => {
      setQueue(prev => prev.map(item =>
        item.id === data.downloadId
          ? { ...item, percent: data.percent, speed: data.speed, eta: data.eta, size: data.size, status: item.status === 'paused' ? 'paused' : 'downloading' }
          : item
      ));
    });

    const unsub2 = window.api.onDownloadComplete((data) => {
      setQueue(prev => prev.map(item =>
        item.id === data.downloadId ? { ...item, status: 'completed', percent: 100 } : item
      ));
    });

    const unsub3 = window.api.onDownloadError((data) => {
      setQueue(prev => prev.map(item =>
        item.id === data.downloadId ? { ...item, status: 'error', errorMsg: data.error } : item
      ));
    });

    const unsub4 = window.api.onDownloadLog((data) => {
      setLogs(prev => {
        const existing = prev[data.downloadId] || '';
        // Keep only the last ~8000 chars per download to bound memory
        const combined = (existing + data.chunk).slice(-8000);
        return { ...prev, [data.downloadId]: combined };
      });
    });

    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [refreshPlugins, loadThemes]);

  // Refresh free disk space when viewing the queue
  useEffect(() => {
    if (activeTab !== 'queue') return;
    let alive = true;
    const tick = () => window.api.getDiskFree().then(v => { if (alive) setDiskFree(v); }).catch(() => {});
    tick();
    const t = setInterval(tick, 5000);
    return () => { alive = false; clearInterval(t); };
  }, [activeTab]);

  // Apply the active theme + user settings whenever any of them change
  useEffect(() => {
    const theme = themes.find(t => t.id === activeThemeId);
    if (theme) applyTheme(theme, themeSettings);
  }, [themes, activeThemeId, themeSettings]);

  // Text size = real browser zoom (reflows the whole window, no empty gaps).
  useEffect(() => {
    const scale = typeof themeSettings.fontScale === 'number' ? themeSettings.fontScale : 100;
    window.api.setZoomFactor?.(scale / 100);
  }, [themeSettings.fontScale]);

  // ── Download tab ──────────────────────────────────────────────────────────

  const handleAnalyze = async (e, overrideUrl) => {
    if (e) e.preventDefault();
    const target = (overrideUrl || url).trim();
    if (!target) return;
    if (overrideUrl) setUrl(overrideUrl);

    setAnalyzing(true);
    setAnalysisError(null);
    setVideoInfo(null);
    setDetectedPlugin(null);

    try {
      const response = await window.api.getVideoInfo(target, chosenEngine);
      if (response.success) {
        setVideoInfo(response.data);
        setDetectedPlugin(response.pluginId || 'yt-dlp');
        // Seed any plugin-declared download form with its defaults
        const dlOpts = {};
        (response.data._downloadOptions || []).forEach(f => { dlOpts[f.key] = f.default; });
        setPluginOpts(dlOpts);
        if (response.data.formats?.length > 0) {
          const vf = response.data.formats.filter(f => f.vcodec !== 'none' && f.resolution);
          if (vf.length > 0) setSelectedCustomFormat(vf[vf.length - 1].format_id);
        }
      }
    } catch (err) {
      setAnalysisError(err.message || 'Error fetching media information.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDownload = async () => {
    if (!videoInfo) return;

    const downloadId = Date.now().toString();
    const title = videoInfo.title || 'Download';
    const thumbnail = getThumbnailUrl(videoInfo);

    let formatArg = '';
    let isAudio = false;

    if (videoInfo._isGallery || videoInfo._plugin === 'gallery-dl') {
      formatArg = 'original';
    } else if (videoInfo._plugin === 'spotdl') {
      formatArg = '';
    } else if (downloadType === 'video') {
      formatArg = selectedResolution === 'best' ? 'bestvideo+bestaudio/best' : `bestvideo[height<=${selectedResolution}]+bestaudio/best`;
    } else if (downloadType === 'audio') {
      isAudio = true;
    } else if (downloadType === 'custom') {
      formatArg = selectedCustomFormat;
    }

    const downloadOptions = {
      pluginId: detectedPlugin || 'yt-dlp',
      format: isAudio ? null : formatArg,
      audioOnly: isAudio,
      audioFormat: selectedAudioFormat,
      downloadFolder: settings.downloadFolder,
      speedLimit: settings.speedLimit,
      embedSubtitles: settings.embedSubtitles,
      sponsorBlock: settings.sponsorBlock,
      // Values from a plugin-declared download form (info._downloadOptions)
      pluginOptions: pluginOpts,
    };

    const newItem = {
      id: downloadId,
      title,
      thumbnail,
      url: url.trim(),
      pluginId: detectedPlugin || 'yt-dlp',
      percent: 0,
      speed: '0 B/s',
      eta: '--:--',
      size: 'Unknown',
      status: 'queued',
      errorMsg: '',
      folder: settings.downloadFolder,
      audioOnly: isAudio,
    };

    setQueue(prev => [newItem, ...prev]);
    setActiveTab('queue');

    try {
      await window.api.startDownload(downloadId, url.trim(), downloadOptions);
    } catch (err) {
      setQueue(prev => prev.map(item =>
        item.id === downloadId ? { ...item, status: 'error', errorMsg: err.message } : item
      ));
    }
  };

  const handleCancelDownload = async (id) => {
    await window.api.cancelDownload(id);
    setQueue(prev => prev.map(item =>
      item.id === id ? { ...item, status: 'error', errorMsg: 'Cancelled by user' } : item
    ));
  };

  const handlePauseDownload = async (id) => {
    const ok = await window.api.pauseDownload(id);
    if (ok) setQueue(prev => prev.map(item => item.id === id ? { ...item, status: 'paused' } : item));
  };

  const handleResumeDownload = async (id) => {
    const ok = await window.api.resumeDownload(id);
    if (ok) setQueue(prev => prev.map(item => item.id === id ? { ...item, status: 'downloading' } : item));
  };

  // Move a queue item up or down in the list (cosmetic ordering)
  const moveQueueItem = (id, dir) => {
    setQueue(prev => {
      const i = prev.findIndex(x => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const toggleLog = (id) => setExpandedLogs(prev => ({ ...prev, [id]: !prev[id] }));

  const handleSelectFolder = async () => {
    const folder = await window.api.selectFolder();
    if (folder) { setSettings(prev => ({ ...prev, downloadFolder: folder })); flashSaved('global'); }
  };

  // ── Plugin management ─────────────────────────────────────────────────────

  const handleTogglePlugin = async (pluginId, currentlyEnabled) => {
    const newEnabled = !currentlyEnabled;
    await window.api.setPluginEnabled(pluginId, newEnabled);
    setDisabledPlugins(prev =>
      newEnabled ? prev.filter(id => id !== pluginId) : [...prev, pluginId]
    );
  };

  const handleImportPlugin = async () => {
    setImportResult(null);
    const result = await window.api.browsePluginFile();
    if (!result) return;
    setImportResult(result);
    if (result.success) await refreshPlugins();
  };

  const handleCopyInstall = async (id, cmd) => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopiedInstall(id);
      setTimeout(() => setCopiedInstall(prev => (prev === id ? null : prev)), 1600);
    } catch (err) {
      console.error('Clipboard write failed:', err);
    }
  };

  // Open a plugin's detail/settings page (and scroll the content back to top)
  const openPluginDetail = (id) => {
    setSelectedPlugin(id);
    if (mainRef.current) mainRef.current.scrollTo({ top: 0 });
  };

  // Briefly show a "Saved" confirmation for a given key
  const flashSaved = (key) => {
    setSavedFlash(key);
    setTimeout(() => setSavedFlash(prev => (prev === key ? null : prev)), 1600);
  };

  // Update one plugin config field and persist immediately (auto-save)
  const updatePluginConfig = (id, key, value) => {
    setPluginConfigs(prev => {
      const next = { ...prev, [id]: { ...(prev[id] || {}), [key]: value } };
      window.api.savePluginConfigs(next);
      return next;
    });
    flashSaved(`plugin:${id}`);
  };

  // Update a global setting and persist immediately (auto-save)
  const updateSetting = (patch) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      window.api.saveSettings(next);
      return next;
    });
    flashSaved('global');
  };

  // ── Theme management ──────────────────────────────────────────────────────

  const handleSetTheme = async (themeId) => {
    setActiveThemeId(themeId);
    await window.api.setActiveTheme(themeId);
  };

  const handleThemeSetting = async (patch) => {
    const next = { ...themeSettings, ...patch };
    setThemeSettings(next);
    await window.api.saveThemeSettings(next);
  };

  const handleImportTheme = async () => {
    setThemeImportResult(null);
    const result = await window.api.browseThemeFile();
    if (!result) return;
    setThemeImportResult(result);
    if (result.success) await loadThemes();
  };

  // ── Active plugins for sidebar ────────────────────────────────────────────

  const availableDownloaders = Object.entries(pluginStatus)
    .filter(([id, p]) => p.type === 'downloader' && p.available && !disabledPlugins.includes(id))
    .map(([id, p]) => ({ id, ...p }));

  const downloaderPlugins = Object.entries(pluginStatus)
    .filter(([, p]) => p.type === 'downloader')
    .sort((a, b) => (a[1].order ?? 99) - (b[1].order ?? 99));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="app-container">
      <div className="titlebar-drag"></div>
      <div className="bg-glow-1"></div>
      <div className="bg-glow-2"></div>

      <Sidebar
        t={t}
        appVersion={appVersion}
        updateInfo={updateInfo}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setSelectedPlugin={setSelectedPlugin}
        queueCount={queue.length}
        checkingDeps={checkingDeps}
        availableDownloaders={availableDownloaders}
        refreshPlugins={refreshPlugins}
      />

      <main className="main-content" ref={mainRef}>
        {activeTab === 'download' && (
          <DownloadTab
            t={t}
            url={url}
            setUrl={setUrl}
            analyzing={analyzing}
            handleAnalyze={handleAnalyze}
            chosenEngine={chosenEngine}
            setChosenEngine={setChosenEngine}
            downloaderPlugins={downloaderPlugins}
            disabledPlugins={disabledPlugins}
            availableDownloaders={availableDownloaders}
            detectedPlugin={detectedPlugin}
            pluginStatus={pluginStatus}
            checkingDeps={checkingDeps}
            analysisError={analysisError}
            videoInfo={videoInfo}
            downloadType={downloadType}
            setDownloadType={setDownloadType}
            selectedResolution={selectedResolution}
            setSelectedResolution={setSelectedResolution}
            selectedAudioFormat={selectedAudioFormat}
            setSelectedAudioFormat={setSelectedAudioFormat}
            selectedCustomFormat={selectedCustomFormat}
            setSelectedCustomFormat={setSelectedCustomFormat}
            pluginOpts={pluginOpts}
            setPluginOpts={setPluginOpts}
            settings={settings}
            handleSelectFolder={handleSelectFolder}
            handleDownload={handleDownload}
          />
        )}

        {activeTab === 'queue' && (
          <QueueTab
            t={t}
            queue={queue}
            setQueue={setQueue}
            logs={logs}
            expandedLogs={expandedLogs}
            toggleLog={toggleLog}
            pluginStatus={pluginStatus}
            handlePauseDownload={handlePauseDownload}
            handleResumeDownload={handleResumeDownload}
            handleCancelDownload={handleCancelDownload}
            moveQueueItem={moveQueueItem}
            diskFree={diskFree}
          />
        )}

        {activeTab === 'plugins' && (
          <PluginsTab
            t={t}
            language={language}
            downloaderPlugins={downloaderPlugins}
            disabledPlugins={disabledPlugins}
            checkingDeps={checkingDeps}
            importResult={importResult}
            handleImportPlugin={handleImportPlugin}
            handleTogglePlugin={handleTogglePlugin}
            openPluginDetail={openPluginDetail}
            selectedPlugin={selectedPlugin}
            setSelectedPlugin={setSelectedPlugin}
            pluginStatus={pluginStatus}
            pluginConfigs={pluginConfigs}
            copiedInstall={copiedInstall}
            handleCopyInstall={handleCopyInstall}
            savedFlash={savedFlash}
            updatePluginConfig={updatePluginConfig}
          />
        )}

        {activeTab === 'themes' && (
          <ThemesTab
            t={t}
            themes={themes}
            activeThemeId={activeThemeId}
            handleSetTheme={handleSetTheme}
            themeImportResult={themeImportResult}
            handleImportTheme={handleImportTheme}
            themeSettings={themeSettings}
            handleThemeSetting={handleThemeSetting}
          />
        )}

        {activeTab === 'settings' && (
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
            setActiveTab={setActiveTab}
            setSelectedPlugin={setSelectedPlugin}
          />
        )}
      </main>
    </div>
  );
}


