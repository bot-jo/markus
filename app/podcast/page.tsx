'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Source {
  title: string;
  url: string;
  source: string;
}

interface Episode {
  slug: string;
  title: string;
  date: string;
  duration: string;
  summary: string;
  transcript: string;
  audioFile: string;
  sources?: Source[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function EpisodeCard({ episode }: { episode: Episode }) {
  return (
    <article className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-gray-700 transition-colors">
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        <div className="flex-1">
          <h2 className="text-2xl font-semibold mb-2 text-white">
            {episode.title}
          </h2>
          <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-4">
            <span>{formatDate(episode.date)}</span>
            <span>•</span>
            <span>Dauer: {episode.duration}</span>
          </div>
          <p className="text-gray-300 mb-2 leading-relaxed">
            {episode.summary}
          </p>
          {episode.sources && episode.sources.length > 0 && (
            <p className="text-xs text-gray-500">
              {episode.sources.length} Quellen
            </p>
          )}
        </div>
        <div className="md:w-64 flex-shrink-0">
          <audio
            controls
            className="w-full h-12"
            preload="metadata"
          >
            <source
              src={`/markus/podcast/audio/${episode.audioFile}`}
              type="audio/mpeg"
            />
            Ihr Browser unterstützt kein Audio-Element.
          </audio>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-800">
        <Link
          href={`/podcast?episode=${episode.slug}`}
          className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
        >
          Zur Episode →
        </Link>
      </div>
    </article>
  );
}

function EpisodeDetail({ episode }: { episode: Episode }) {
  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href="/podcast"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-cyan-400 mb-8 transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Zurück zur Übersicht
      </Link>

      <article>
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            {episode.title}
          </h1>
          <div className="flex flex-wrap gap-4 text-gray-400">
            <span>{formatDate(episode.date)}</span>
            <span>•</span>
            <span>Dauer: {episode.duration}</span>
          </div>
        </header>

        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-8">
          <audio
            controls
            className="w-full h-14"
            preload="metadata"
          >
            <source
              src={`/markus/podcast/audio/${episode.audioFile}`}
              type="audio/mpeg"
            />
            Ihr Browser unterstützt kein Audio-Element.
          </audio>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Zusammenfassung</h2>
            <p className="text-gray-300 leading-relaxed">
              {episode.summary}
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Transkript</h2>
            <div className="text-gray-300 leading-relaxed whitespace-pre-line">
              {episode.transcript}
            </div>
          </div>

          {episode.sources && episode.sources.length > 0 && (
            <div className="border-t border-gray-800 pt-8 mt-8">
              <h2 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wide">Quellen</h2>
              <ul className="space-y-2">
                {episode.sources.map((src, index) => (
                  <li key={index} className="text-xs text-gray-500">
                    <span className="text-gray-600">{index + 1}.</span>{' '}
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-cyan-400 transition-colors"
                    >
                      {src.title}
                    </a>
                    <span className="text-gray-600"> — {src.source}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}

function EpisodeList({ episodes }: { episodes: Episode[] }) {
  return (
    <div className="space-y-8">
      {episodes.map((episode) => (
        <EpisodeCard key={episode.slug} episode={episode} />
      ))}
    </div>
  );
}

async function getEpisodes(): Promise<Episode[]> {
  try {
    const res = await fetch('/podcast-data/episodes.json', { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

function PodcastContent() {
  const searchParams = useSearchParams();
  const episodeSlug = searchParams.get('episode');
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/markus/podcast-data/episodes.json')
      .then((res) => res.json())
      .then((data) => {
        setEpisodes(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">Laden...</p>
      </div>
    );
  }

  // If viewing a specific episode
  if (episodeSlug) {
    const episode = episodes.find((e) => e.slug === episodeSlug);
    if (episode) {
      return <EpisodeDetail episode={episode} />;
    }
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">Episode nicht gefunden.</p>
        <Link href="/podcast" className="text-cyan-400 hover:text-cyan-300 mt-4 inline-block">
          Zurück zur Übersicht
        </Link>
      </div>
    );
  }

  // Episode list view
  return (
    <div>
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4 text-cyan-400">Energie Podcast</h1>
        <p className="text-gray-400 text-lg">
          Aktuelle Nachrichten aus der Energiewirtschaft — jeden Montag, Mittwoch und Freitag.
        </p>
      </div>

      {episodes.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg">Noch keine Episoden vorhanden.</p>
        </div>
      ) : (
        <EpisodeList episodes={episodes} />
      )}
    </div>
  );
}

export default function PodcastPage() {
  return (
    <Suspense fallback={
      <div className="text-center py-16">
        <p className="text-gray-400">Laden...</p>
      </div>
    }>
      <PodcastContent />
    </Suspense>
  );
}
