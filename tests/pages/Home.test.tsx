// Linked to: US-004, US-005, US-006, US-007
import { render, screen } from '@testing-library/react';
import Home from '@/app/page';

describe('Home', () => {
  it('renders hero section with "Jo"', () => {
    render(<Home />);
    expect(screen.getByText('Jo')).toBeInTheDocument();
    expect(screen.getByText('Dein persönlicher AI-Assistent')).toBeInTheDocument();
  });

  it('renders all four capability cards', () => {
    render(<Home />);
    expect(screen.getByText('Email Management')).toBeInTheDocument();
    expect(screen.getByText('Calendar Management')).toBeInTheDocument();
    expect(screen.getByText('Shopping List')).toBeInTheDocument();
    expect(screen.getByText('This GitHub Page')).toBeInTheDocument();
  });

  it('renders CTA button with GitHub link', () => {
    render(<Home />);
    const ctaButton = screen.getByRole('link', { name: /github repository/i });
    expect(ctaButton).toBeInTheDocument();
    expect(ctaButton).toHaveAttribute('href', 'https://github.com/bot-jo/markus');
  });

  it('renders "View Docs & Wiki" link on GitHub Page card', () => {
    render(<Home />);
    const wikiLink = screen.getByRole('link', { name: /view docs & wiki/i });
    expect(wikiLink).toBeInTheDocument();
    expect(wikiLink).toHaveAttribute('href', 'https://github.com/bot-jo/markus/wiki');
  });
});
