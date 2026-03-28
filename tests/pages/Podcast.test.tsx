// Linked to: US-023, US-024
import { render, screen, waitFor } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';

// Mock fetch for episodes.json
const mockEpisodes = [
  {
    slug: "2026-03-28",
    title: "Energie News — 28. März 2026",
    date: "2026-03-28",
    duration: "10:00",
    summary: "In dieser Episode besprechen wir die wichtigsten Energie-Nachrichten.",
    transcript: "Willkommen zu den Energie News...",
    audioFile: "2026-03-28.mp3",
  },
  {
    slug: "2026-03-26",
    title: "Energie News — 26. März 2026",
    date: "2026-03-26",
    duration: "8:30",
    summary: "Die neuesten Entwicklungen aus der Solarbranche.",
    transcript: "Willkommen zur zweiten Episode...",
    audioFile: "2026-03-26.mp3",
  },
];

// Mock global fetch
global.fetch = jest.fn((url: string) => {
  if (url.includes('episodes.json')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockEpisodes),
    });
  }
  return Promise.reject(new Error('Not found'));
}) as jest.Mock;

// Mock next/navigation
const pushMock = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

import PodcastPage from '@/app/podcast/page';

describe('Podcast Page (US-023, US-024)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());
  });

  it('renders page heading "Energie Podcast"', async () => {
    render(<PodcastPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Energie Podcast')).toBeInTheDocument();
    });
  });

  it('renders episode list when episodes exist', async () => {
    render(<PodcastPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Energie News — 28. März 2026')).toBeInTheDocument();
      expect(screen.getByText('Energie News — 26. März 2026')).toBeInTheDocument();
    });
  });

  it('renders empty state when no episodes exist', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });
    
    render(<PodcastPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Noch keine Episoden vorhanden.')).toBeInTheDocument();
    });
  });

  it('each episode card shows title, date, summary, and audio player', async () => {
    render(<PodcastPage />);
    
    await waitFor(() => {
      // Check first episode
      const firstEpisode = screen.getByText('Energie News — 28. März 2026').closest('article');
      expect(firstEpisode).toBeInTheDocument();
      expect(firstEpisode?.textContent).toContain('28. März 2026');
      expect(firstEpisode?.textContent).toContain('10:00');
      
      // Check audio elements exist in the document
      const audioElements = document.querySelectorAll('audio');
      expect(audioElements.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows episode detail when episode query param is set', async () => {
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams('episode=2026-03-28'));
    
    render(<PodcastPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Energie News — 28. März 2026')).toBeInTheDocument();
      expect(screen.getByText('Zusammenfassung')).toBeInTheDocument();
      expect(screen.getByText('Transkript')).toBeInTheDocument();
    });
  });

  it('shows back link on episode detail page', async () => {
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams('episode=2026-03-28'));
    
    render(<PodcastPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Zurück zur Übersicht')).toBeInTheDocument();
    });
  });

  it('shows 404 message for non-existent episode', async () => {
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams('episode=nonexistent'));
    
    render(<PodcastPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Episode nicht gefunden.')).toBeInTheDocument();
    });
  });
});
