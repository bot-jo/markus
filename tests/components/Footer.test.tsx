// Linked to: US-003
import { render, screen } from '@testing-library/react';
import Footer from '@/components/Footer';

describe('Footer', () => {
  it('renders site name', () => {
    render(<Footer />);
    expect(screen.getByText('Jo')).toBeInTheDocument();
  });

  it('renders tagline', () => {
    render(<Footer />);
    expect(screen.getByText('Dein persönlicher AI-Assistent')).toBeInTheDocument();
  });

  it('is present in the layout', () => {
    render(<Footer />);
    const footer = screen.getByRole('contentinfo');
    expect(footer).toBeInTheDocument();
  });
});
