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
        setTranscripts(data);
      }
    } catch (err) {
      console.error('Error fetching transcripts:', err);
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
    setTranscripts((prev) => [newTranscript, ...prev]);
    // Redirect instantly to history so they can edit, copy, or download!
    setCurrentView('history');
  };

  // Update transcript (saving edited entries directly back to local server)
  const handleUpdateTranscript = async (updatedTranscript: Transcript) => {
    try {
      const response = await fetch(`/api/transcripts/${updatedTranscript.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTranscript),
      });

      if (response.ok) {
        setTranscripts((prev) => 
          prev.map((t) => (t.id === updatedTranscript.id ? updatedTranscript : t))
        );
      } else {
        console.error('Failed to sync changes with local database.');
      }
    } catch (err) {
      console.error('Error updating transcript:', err);
    }
  };

  // Delete transcript
  const handleDeleteTranscript = async (id: string) => {
    try {
      const response = await fetch(`/api/transcripts/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTranscripts((prev) => prev.filter((t) => t.id !== id));
      } else {
        console.error('Failed to delete transcript from local database.');
      }
    } catch (err) {
      console.error('Error deleting transcript:', err);
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
