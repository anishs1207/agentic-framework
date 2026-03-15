'use client';

import React, { useState } from 'react';
import { queryMemory } from '@/lib/api';
import api from '@/lib/api';

const QuerySection: React.FC = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const [mode, setMode] = useState<'ask' | 'search'>('ask');
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsQuerying(true);
    setError(null);
    setResult(null);
    setSearchResults([]);

    try {
      if (mode === 'ask') {
        const data = await queryMemory(query);
        setResult(data);
      } else {
        // We need to add searchImages to lib/api.ts
        const response = await api.get('/images/search', { params: { query } });
        setSearchResults(response.data || []);
      }
    } catch (err: any) {
      console.error('Action failed:', err);
      setError(err.response?.data?.message || 'Action failed. Please try again.');
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="glass" style={{ padding: '2rem', marginBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Visual Query Engine</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {mode === 'ask' ? 'Ask complex questions about your memories.' : 'Find specific visual patterns and concepts.'}
          </p>
        </div>
        <div style={{ 
          display: 'flex', 
          backgroundColor: 'rgba(255, 255, 255, 0.05)', 
          padding: '4px', 
          borderRadius: '100px',
          border: '1px solid var(--glass-border)'
        }}>
          <button 
            onClick={() => setMode('ask')}
            style={{ 
              padding: '0.4rem 1rem', 
              borderRadius: '100px', 
              border: 'none',
              fontSize: '0.75rem',
              fontWeight: '600',
              cursor: 'pointer',
              backgroundColor: mode === 'ask' ? 'var(--accent-primary)' : 'transparent',
              color: mode === 'ask' ? 'white' : 'var(--text-muted)',
              transition: 'all 0.2s'
            }}
          >
            ASK AI
          </button>
          <button 
            onClick={() => setMode('search')}
            style={{ 
              padding: '0.4rem 1rem', 
              borderRadius: '100px', 
              border: 'none',
              fontSize: '0.75rem',
              fontWeight: '600',
              cursor: 'pointer',
              backgroundColor: mode === 'search' ? 'var(--accent-primary)' : 'transparent',
              color: mode === 'search' ? 'white' : 'var(--text-muted)',
              transition: 'all 0.2s'
            }}
          >
            SEARCH
          </button>
        </div>
      </div>
      
      <form onSubmit={handleAction} style={{ display: 'flex', gap: '1rem' }}>
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={mode === 'ask' ? "e.g., Who was present at the park last Sunday?" : "e.g., red cars, mountains, people smiling"}
          style={{ 
            flexGrow: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--glass-border)',
            padding: '1rem',
            borderRadius: '12px',
            color: 'white',
            outline: 'none',
            fontSize: '1rem'
          }}
          disabled={isQuerying}
        />
        <button 
          type="submit"
          disabled={isQuerying}
          style={{ 
            backgroundColor: 'var(--accent-primary)',
            color: 'white',
            padding: '0.75rem 2.5rem',
            borderRadius: '12px',
            fontWeight: '700',
            opacity: isQuerying ? 0.7 : 1,
            cursor: isQuerying ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
          }}
        >
          {isQuerying ? 'Analyzing...' : mode === 'ask' ? 'Ask AI' : 'Search'}
        </button>
      </form>

      {error && (
        <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '1rem' }}>
          {error}
        </p>
      )}

      {result && (
        <div style={{ 
          marginTop: '2rem', 
          padding: '1.5rem', 
          backgroundColor: 'rgba(59, 130, 246, 0.05)', 
          borderRadius: '12px',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          animation: 'fade-in 0.3s ease-out'
        }}>
          <h3 style={{ fontSize: '0.75rem', marginBottom: '1rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Response:</h3>
          <div style={{ color: 'var(--text-primary)', lineHeight: '1.8', fontSize: '1.1rem' }}>
            {result.answer || (typeof result === 'string' ? result : JSON.stringify(result, null, 2))}
          </div>
        </div>
      )}

      {searchResults.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ fontSize: '0.75rem', marginBottom: '1.5rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Found {searchResults.length} Relevant Memories:</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {searchResults.map((img) => (
              <div key={img.imageId} className="glass glass-hover" style={{ overflow: 'hidden', borderRadius: '12px' }}>
                <div style={{ position: 'relative', width: '100%', paddingTop: '75%' }}>
                   <img 
                    src={`${api.defaults.baseURL}/images/${img.imageId}/file`} 
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} 
                   />
                </div>
                <div style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {img.filename}
                  {img.score && <div style={{ fontSize: '0.7rem', color: 'var(--accent-primary)' }}>{Math.round(img.score * 100)}% Match</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuerySection;
