// Linked to: US-008, US-010
import { render, screen } from '@testing-library/react';

// Mock fs module - no recipes
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  readdirSync: jest.fn().mockReturnValue([]),
}));

import RezeptePage from '@/app/rezepte/page';

describe('Rezepte', () => {
  it('shows placeholder text when no recipes exist', () => {
    render(<RezeptePage />);
    expect(screen.getByText('Noch keine Rezepte vorhanden.')).toBeInTheDocument();
  });

  it('does not show recipe heading when no recipes', () => {
    render(<RezeptePage />);
    expect(screen.queryByText('Rezepte')).not.toBeInTheDocument();
  });
});
