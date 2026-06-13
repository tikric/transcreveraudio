/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TranscribeView from './components/TranscribeView';
import HistoryView from './components/HistoryView';
import SupportView from './components/SupportView';
import SettingsView from './components/SettingsView';
import ShareView from './components/ShareView';
import { Transcript, ViewType } from './types';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('transcribe');
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharedId, setSharedId] = useState<string | null>(null);

  // Helper to prevent duplicate React keys by deduplicating transcripts by id
  const filterUniqueTranscripts = (items: Transcript[]): Transcript[] => {
    const seen = new Set<string>();
    return items.filter((item) => {
      if (!item || !item.id) return false;
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  };

  // Parse path to check if we are accessing a share link
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/share/')) {
      const parts = path.split('/');
      const id = parts[parts.length - 1];
      if (id) {
        setSharedId(id);
      }
    }
  }, []);

  // Fetch all transcripts on load from the server local storage database
  const fetchTranscripts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/transcripts');
      if (response.ok) {
        const data = await response.json();
        setTranscripts(filterUniqueTranscripts(data));
        try {
          localStorage.setItem('fosiscribe_offline_transcripts', JSON.stringify(filterUniqueTranscripts(data)));
        } catch (e) {}
      } else {
        // Fallback to local storage if API fails (e.g. 405 Method Not Allowed)
        const offline = localStorage.getItem('fosiscribe_offline_transcripts');
        if (offline) {
          try {
            setTranscripts(filterUniqueTranscripts(JSON.parse(offline)));
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error('Error fetching transcripts, falling back to offline storage:', err);
      const offline = localStorage.getItem('fosiscribe_offline_transcripts');
      if (offline) {
        try {
          setTranscripts(filterUniqueTranscripts(JSON.parse(offline)));
        } catch (e) {}
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sharedId) {
      fetchTranscripts();
    }
  }, [sharedId]);

  // Handle new transcript completion
  const handleTranscriptionSuccess = async (newTranscript: Transcript) => {
    // Save to server if we can, but also save to local memory & localStorage
    setTranscripts((prev) => {
      const updated = filterUniqueTranscripts([newTranscript, ...prev]);
      try {
        localStorage.setItem('fosiscribe_offline_transcripts', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      await fetch('/api/transcripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTranscript),
      });
    } catch (err) {
      console.warn('Could not back up new transcript on sever, stored in browser memory.');
    }

    // Redirect instantly to history so they can edit, copy, or download!
    setCurrentView('history');
  };

  // Update transcript (saving edited entries directly back to local server)
  const handleUpdateTranscript = async (updatedTranscript: Transcript) => {
    setTranscripts((prev) => {
      const updated = filterUniqueTranscripts(prev.map((t) => (t.id === updatedTranscript.id ? updatedTranscript : t)));
      try {
        localStorage.setItem('fosiscribe_offline_transcripts', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      await fetch(`/api/transcripts/${updatedTranscript.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTranscript),
      });
    } catch (err) {
      console.warn('Could not sync transcript update to server, updated browser local storage instead.');
    }
  };

  // Delete transcript
  const handleDeleteTranscript = async (id: string) => {
    setTranscripts((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      try {
        localStorage.setItem('fosiscribe_offline_transcripts', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      await fetch(`/api/transcripts/${id}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.warn('Could not run remote transcript delete, deleted from browser local storage instead.');
    }
  };

  // Render Public Shared Transcript directly if active
  if (sharedId) {
    return <ShareView id={sharedId} />;
  }

  // Render primary application dashboard layout
  return (
    <div id="foziscribe-dashboard" className="flex min-h-screen bg-[#050508] text-white font-sans overflow-hidden">
      {/* Structural Sidebar */}
      <Sidebar 
        currentView={currentView} 
        onViewChange={(view) => setCurrentView(view)} 
      />

      {/* Main content body canvas */}
      <main id="dashboard-content" className="flex-1 p-4 sm:p-8 max-h-screen overflow-y-auto">
        <div id="view-animator" className="max-w-6xl mx-auto">
          {currentView === 'transcribe' && (
            <TranscribeView onTranscriptionSuccess={handleTranscriptionSuccess} />
          )}
          {currentView === 'history' && (
            <HistoryView 
              transcripts={transcripts}
              loading={loading}
              onRefresh={fetchTranscripts}
              onUpdate={handleUpdateTranscript}
              onDelete={handleDeleteTranscript}
            />
          )}
          {currentView === 'support' && <SupportView />}
          {currentView === 'settings' && <SettingsView />}
        </div>
      </main>
    </div>
  );
}
