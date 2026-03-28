// Linked to: US-011
import { render, screen } from '@testing-library/react';
import ImpostorGamePage from '@/app/impostor-game/page';

describe('ImpostorGame', () => {
  it('renders page heading "Impostor Game"', () => {
    render(<ImpostorGamePage />);
    expect(screen.getByText('Impostor Game')).toBeInTheDocument();
  });

  it('renders placeholder text "Inhalte folgen bald."', () => {
    render(<ImpostorGamePage />);
    expect(screen.getByText('Inhalte folgen bald.')).toBeInTheDocument();
  });
});
