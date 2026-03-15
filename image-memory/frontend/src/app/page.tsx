'use client';

import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import UploadSection from '@/components/UploadSection';
import QuerySection from '@/components/QuerySection';
import ImageCard from '@/components/ImageCard';
import PersonCard from '@/components/PersonCard';
import RelationshipSection from '@/components/RelationshipSection';
import EventTimeline from '@/components/EventTimeline';
import { getAllImages, getAllPeople, getAllRelationships, getAllEvents, resetAllData } from '@/lib/api';

export default function Home() {
  const [images, setImages] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [currentTab, setCurrentTab] = useState<'gallery' | 'people' | 'relationships' | 'timeline'>('gallery');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [imageData, peopleData, relData, eventData] = await Promise.all([
        getAllImages(),
        getAllPeople(),
        getAllRelationships(),
        getAllEvents()
      ]);
      setImages(imageData || []);
      setPeople(peopleData || []);
      setRelationships(relData || []);
      setEvents(eventData || []);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch data:', err);
      setError('Could not connect to the backend. Please ensure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Are you absolutely sure you want to clear all memories? This cannot be undone.')) {
      try {
        await resetAllData();
        fetchData();
        alert('All data has been cleared.');
      } catch (err) {
        console.error('Reset failed:', err);
        alert('Failed to clear data.');
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <main style={{ minHeight: '100vh', padding: '2rem 1rem max(5vw, 2rem)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <Header />
        
        {/* Stats Overview */}
        {!isLoading && !error && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4, 1fr)', 
            gap: '1rem', 
            marginBottom: '2rem',
            animation: 'slide-up 0.5s ease-out'
          }}>
            {[
              { label: 'Photos', value: images.length },
              { label: 'People', value: people.length },
              { label: 'Connections', value: relationships.length },
              { label: 'Events', value: events.length }
            ].map((stat, i) => (
              <div key={i} className="glass" style={{ padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--accent-primary)' }}>{stat.value}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}
        
        <UploadSection onUploadSuccess={fetchData} />
        
        <QuerySection />
        
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {['gallery', 'people', 'relationships', 'timeline'].map((tab) => (
              <button
                key={tab}
                onClick={() => setCurrentTab(tab as any)}
                className={currentTab === tab ? 'tab-active' : 'tab-inactive'}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '100px',
                  backgroundColor: currentTab === tab ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.05)',
                  color: currentTab === tab ? 'white' : 'var(--text-secondary)',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  border: '1px solid var(--glass-border)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textTransform: 'capitalize'
                }}
              >
                {tab === 'people' ? 'Identity Vault' : tab === 'relationships' ? 'Network Explorer' : tab === 'timeline' ? 'Timeline' : 'Gallery'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={fetchData}
              style={{ 
                color: 'var(--text-secondary)', 
                fontSize: '0.875rem',
                textDecoration: 'none',
                backgroundColor: 'rgba(255,255,255,0.05)',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--glass-border)',
                cursor: 'pointer'
              }}
            >
              🔄 Sync
            </button>
            <button 
              onClick={handleReset}
              style={{ 
                color: '#ef4444', 
                fontSize: '0.875rem',
                textDecoration: 'none',
                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                cursor: 'pointer'
              }}
            >
              🗑️ Reset
            </button>
          </div>
        </div>

        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass" style={{ height: '300px', opacity: 0.3 }}></div>
            ))}
          </div>
        ) : error ? (
          <div className="glass" style={{ padding: '3rem', textAlign: 'center', color: '#ef4444' }}>
            {error}
          </div>
        ) : (
          <>
            {currentTab === 'gallery' && (
              images.length === 0 ? (
                <div className="glass" style={{ padding: '5rem', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>
                    No images found. Upload your first image to begin building your visual memory!
                  </p>
                </div>
              ) : (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                  gap: '2rem' 
                }}>
                  {images.map((image) => (
                    <ImageCard key={image.imageId} image={image} people={people} />
                  ))}
                </div>
              )
            )}

            {currentTab === 'people' && (
              people.length === 0 ? (
                <div className="glass" style={{ padding: '5rem', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>
                    No identities extracted yet. Processing images will automatically identify and catalog people.
                  </p>
                </div>
              ) : (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                  gap: '1.5rem' 
                }}>
                  {people.map((person) => (
                    <PersonCard key={person.personId} person={person} relationships={relationships} people={people} onRename={fetchData} />
                  ))}
                </div>
              )
            )}

            {currentTab === 'relationships' && (
              <RelationshipSection relationships={relationships} people={people} />
            )}

            {currentTab === 'timeline' && (
              <EventTimeline events={events} />
            )}
          </>
        )}
      </div>
    </main>
  );
}
