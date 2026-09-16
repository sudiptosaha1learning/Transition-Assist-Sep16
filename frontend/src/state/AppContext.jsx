import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { INDEXER_URL } from '../api.js';

const AppCtx = createContext(null);

export function AppProvider({ children }) {
  // Mirrors the original vanilla-JS globals: `activeApp`, `currentModel`,
  // `currentProvider`, `geminiKey`, `openaiKeyOverride`, plus whether the
  // wizard is showing and which nav item is unlocked/active.
  const [activeApp, setActiveApp] = useState(null); // {app_id, display_name, repo_name, repo_url, files, chunks}
  const [showWizard, setShowWizard] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [scene, setScene] = useState('overview');

  const [currentModel, setCurrentModel] = useState('gpt-4o-mini');
  const [currentProvider, setCurrentProvider] = useState('openai');
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKeyOverride, setOpenaiKeyOverride] = useState('');

  const modelParams = useCallback(() => ({
    model: currentModel,
    api_key: currentProvider === 'gemini' ? geminiKey : openaiKeyOverride,
  }), [currentModel, currentProvider, geminiKey, openaiKeyOverride]);

  const enterPlatform = useCallback((app) => {
    localStorage.setItem('lumina_last_active_app_id', app.app_id);
    setActiveApp(app);
    setUnlocked(true);
    setShowWizard(false);
    setScene('overview');
  }, []);

  const switchApp = useCallback(async (app) => {
    if (activeApp && activeApp.app_id === app.app_id) return;
    try { await fetch(`${INDEXER_URL}/apps/${app.app_id}/activate`, { method: 'POST' }); } catch { /* noop */ }
    localStorage.setItem('lumina_last_active_app_id', app.app_id);
    setActiveApp(app);
    setScene('overview');
  }, [activeApp]);

  const openWizard = useCallback(() => {
    setShowWizard(true);
  }, []);

  useEffect(() => {
    async function autoLoad() {
      const lastActiveId = localStorage.getItem('lumina_last_active_app_id');
      try {
        const r = await fetch(`${INDEXER_URL}/apps`);
        if (!r.ok) return;
        const d = await r.json();
        const apps = d.apps || [];
        if (apps.length > 0) {
          let targetApp = apps.find(a => a.app_id === lastActiveId);
          if (!targetApp) {
            targetApp = apps[0];
          }
          // Activate the app on the backend indexer
          try {
            await fetch(`${INDEXER_URL}/apps/${targetApp.app_id}/activate`, { method: 'POST' });
          } catch (err) {
            console.error("Failed to activate app on backend:", err);
          }
          setActiveApp(targetApp);
          setUnlocked(true);
          setShowWizard(false);
        }
      } catch (err) {
        console.error("Error auto-loading apps:", err);
        // Fallback: Check if we have local apps in localStorage we can restore offline
        try {
          const localApps = JSON.parse(localStorage.getItem('lumina_apps') || '[]');
          if (localApps.length > 0) {
            let targetApp = localApps.find(a => a.app_id === lastActiveId) || localApps[0];
            setActiveApp(targetApp);
            setUnlocked(true);
            setShowWizard(false);
          }
        } catch (e) {}
      }
    }
    autoLoad();
  }, []);

  const value = {
    activeApp, setActiveApp,
    showWizard, setShowWizard, openWizard,
    unlocked, setUnlocked,
    scene, setScene,
    currentModel, setCurrentModel,
    currentProvider, setCurrentProvider,
    geminiKey, setGeminiKey,
    openaiKeyOverride, setOpenaiKeyOverride,
    modelParams,
    enterPlatform,
    switchApp,
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
