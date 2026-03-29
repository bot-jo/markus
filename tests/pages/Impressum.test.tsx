// Linked to: US-033
import { render, screen } from '@testing-library/react';
import Impressum from '@/app/impressum/page';

describe('Impressum (US-033)', () => {
  it('renders "Impressum" heading', () => {
    render(<Impressum />);
    expect(screen.getByText('Impressum')).toBeInTheDocument();
  });

  it('renders name "Markus Schwarz"', () => {
    render(<Impressum />);
    expect(screen.getByText(/Markus Schwarz/i)).toBeInTheDocument();
  });

  it('renders address "Fleischmanngasse"', () => {
    render(<Impressum />);
    expect(screen.getByText(/Fleischmanngasse/i)).toBeInTheDocument();
  });

  it('renders email "bot.jo.openclaw@gmail.com"', () => {
    render(<Impressum />);
    expect(screen.getByText('bot.jo.openclaw@gmail.com')).toBeInTheDocument();
  });
});
