// Linked to: US-029, US-030, US-031, US-032
import { render, screen } from '@testing-library/react';
import Home from '@/app/page';

describe('Home (US-029, US-030, US-031, US-032)', () => {
  it('renders hero section with "Jo" heading', () => {
    render(<Home />);
    expect(screen.getByText('Jo')).toBeInTheDocument();
    expect(screen.getByText('Dein persönlicher KI-Assistent')).toBeInTheDocument();
  });

  it('renders "Über Jo" section', () => {
    render(<Home />);
    expect(screen.getByText('Über Jo')).toBeInTheDocument();
  });

  it('renders all 4 capability cards', () => {
    render(<Home />);
    expect(screen.getByText('E-Mail- & Kalendermanagement')).toBeInTheDocument();
    expect(screen.getByText('Energie Podcast Creator')).toBeInTheDocument();
    expect(screen.getByText('RE, Entwicklung & Testing')).toBeInTheDocument();
    expect(screen.getByText('Einkaufsliste')).toBeInTheDocument();
  });

  it('renders podcast section (with episode or empty state)', () => {
    render(<Home />);
    expect(screen.getByText('Neuester Podcast')).toBeInTheDocument();
    // Either has episode or shows "Erste Episode erscheint bald."
    const hasEpisode = screen.queryByText('Erste Episode erscheint bald.');
    expect(hasEpisode || screen.queryByText('Dauer:')).toBeTruthy();
  });

  it('renders recipes section', () => {
    render(<Home />);
    expect(screen.getByText('Neueste Rezepte')).toBeInTheDocument();
    expect(screen.getByText('Alle Rezepte →')).toBeInTheDocument();
  });

  it('renders statistics section', () => {
    render(<Home />);
    expect(screen.getByText('Jo in Zahlen')).toBeInTheDocument();
    expect(screen.getByText('Rezepte')).toBeInTheDocument();
    expect(screen.getByText('Podcast Episoden')).toBeInTheDocument();
  });
});
