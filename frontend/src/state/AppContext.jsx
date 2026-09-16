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

  const [showLaunchpad, setShowLaunchpad] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [orchestratingProject, setOrchestratingProject] = useState(null);

  const enterPlatform = useCallback((app) => {
    localStorage.setItem('lumina_last_active_app_id', app.app_id || app.project_id);
    setActiveApp(app);
    setUnlocked(true);
    setShowWizard(false);
    setShowLaunchpad(false);
    setIsAnalyzing(false);
    setScene('overview');
  }, []);

  const openLaunchpad = useCallback(() => {
    setShowLaunchpad(true);
    setShowWizard(false);
    setIsAnalyzing(false);
  }, []);

  const startAgenticAnalysis = useCallback((projectConfig) => {
    setOrchestratingProject(projectConfig);
    setIsAnalyzing(true);
    setShowLaunchpad(false);
    setShowWizard(false);
  }, []);

  const resolveGap = useCallback(async (gapId, answer, smeName = 'SME') => {
    if (!activeApp) return;
    try {
      const res = await fetch(`${INDEXER_URL}/projects/${activeApp.app_id}/gaps/${gapId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer, sme_name: smeName })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveApp(prev => {
          if (!prev) return prev;
          const updatedGaps = (prev.gaps || []).map(g => g.id === gapId ? { ...g, status: 'reconciled', resolution: answer, resolved_by: smeName } : g);
          const updatedKT = (prev.kt_packs || []).map(q => q.gap_id === gapId ? { ...q, status: 'answered', answer } : q);
          return { ...prev, gaps: updatedGaps, kt_packs: updatedKT };
        });
        return data;
      }
    } catch (e) {
      console.error('Failed to resolve gap:', e);
    }
  }, [activeApp]);

  const answerKTQuestion = useCallback(async (questionId, answer, smeName = 'SME') => {
    if (!activeApp) return;
    try {
      const res = await fetch(`${INDEXER_URL}/projects/${activeApp.app_id}/kt/${questionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer, sme_name: smeName })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveApp(prev => {
          if (!prev) return prev;
          const updatedKT = (prev.kt_packs || []).map(q => q.id === questionId ? { ...q, status: 'answered', answer } : q);
          const targetQ = (prev.kt_packs || []).find(q => q.id === questionId);
          const updatedGaps = (prev.gaps || []).map(g => (targetQ && g.id === targetQ.gap_id) ? { ...g, status: 'reconciled', resolution: answer } : g);
          return { ...prev, kt_packs: updatedKT, gaps: updatedGaps };
        });
        return data;
      }
    } catch (e) {
      console.error('Failed to answer KT question:', e);
    }
  }, [activeApp]);

  const switchApp = useCallback(async (app) => {
    if (activeApp && (activeApp.app_id === app.app_id || activeApp.app_id === app.project_id)) return;
    try { await fetch(`${INDEXER_URL}/apps/${app.app_id || app.project_id}/activate`, { method: 'POST' }); } catch { /* noop */ }
    localStorage.setItem('lumina_last_active_app_id', app.app_id || app.project_id);
    setActiveApp(app);
    setShowLaunchpad(false);
    setShowWizard(false);
    setIsAnalyzing(false);
    setScene('overview');
  }, [activeApp]);

  const openWizard = useCallback(() => {
    setShowWizard(true);
    setShowLaunchpad(false);
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
          let targetApp = apps.find(a => (a.app_id === lastActiveId || a.project_id === lastActiveId));
          if (!targetApp) {
            targetApp = apps[0];
          }
          // Activate the app on the backend indexer
          try {
            await fetch(`${INDEXER_URL}/apps/${targetApp.app_id || targetApp.project_id}/activate`, { method: 'POST' });
          } catch (err) {
            console.error("Failed to activate app on backend:", err);
          }
          setActiveApp(targetApp);
          setUnlocked(true);
          setShowWizard(false);
          setShowLaunchpad(false);
        }
      } catch (err) {
        console.error("Error auto-loading apps:", err);
      }
    }
    autoLoad();
  }, []);

  const value = {
    activeApp, setActiveApp,
    showWizard, setShowWizard, openWizard,
    showLaunchpad, setShowLaunchpad, openLaunchpad,
    isAnalyzing, setIsAnalyzing, orchestratingProject, startAgenticAnalysis,
    resolveGap, answerKTQuestion,
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
