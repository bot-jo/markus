// Linked to: US-001, US-002
import { render, screen } from '@testing-library/react';
import Header from '@/components/Header';

describe('Header', () => {
  it('renders logo text "Jo"', () => {
    render(<Header />);
    expect(screen.getByText('Jo')).toBeInTheDocument();
  });

  it('renders navigation links: Home, Rezepte, Impostor Game', () => {
    render(<Header />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Rezepte')).toBeInTheDocument();
    expect(screen.getByText('Impostor Game')).toBeInTheDocument();
  });

  it('all nav links have correct href attributes', () => {
    render(<Header />);
    const homeLink = screen.getByText('Home').closest('a');
    const rezepteLink = screen.getByText('Rezepte').closest('a');
    const impostorLink = screen.getByText('Impostor Game').closest('a');

    expect(homeLink).toHaveAttribute('href', '/');
    expect(rezepteLink).toHaveAttribute('href', '/rezepte');
    expect(impostorLink).toHaveAttribute('href', '/impostor-game');
  });

  it('mobile menu button is present', () => {
    render(<Header />);
    const menuButton = screen.getByRole('button', { name: /toggle menu/i });
    expect(menuButton).toBeInTheDocument();
  });
});
