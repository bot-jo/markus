// Linked to: US-008, US-010, US-020, US-021, US-022
import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';

// Mock fs module - no recipes
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  readdirSync: jest.fn().mockReturnValue([]),
}));

// Mock next/navigation
const pushMock = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: jest.fn(() => new URLSearchParams()),
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

describe('RecipeList tag filtering', () => {
  const mockRecipes = [
    {
      slug: 'pasta',
      title: 'Pasta',
      description: 'Lecker',
      date: '2024-01-01',
      servings: 4,
      prepTime: '30 min',
      tags: ['italienisch', 'vegetarisch'],
    },
    {
      slug: 'pizza',
      title: 'Pizza',
      description: 'Knusprig',
      date: '2024-01-02',
      servings: 2,
      prepTime: '45 min',
      tags: ['italienisch', 'vegetarisch'],
    },
    {
      slug: 'burger',
      title: 'Burger',
      description: 'Saftig',
      date: '2024-01-03',
      servings: 2,
      prepTime: '20 min',
      tags: ['amerikanisch'],
    },
  ];

  const allTags = ['amerikanisch', 'italienisch', 'vegetarisch'];

  beforeEach(() => {
    pushMock.mockClear();
  });

  it('renders tag filter pills', async () => {
    const { default: RecipeList } = await import('@/components/RecipeList');
    render(<RecipeList recipes={mockRecipes} allTags={allTags} />);
    const pills = screen.getAllByRole('button');
    // There are 3 filter pills + recipe card tag buttons = 3 + 2 (pasta) + 2 (pizza) + 1 (burger) = 8
    expect(pills.length).toBeGreaterThanOrEqual(3);
  });

  it('shows active filter indicator when tag is selected', async () => {
    const { useSearchParams } = await import('next/navigation');
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams('tag=italienisch'));

    const { default: RecipeList } = await import('@/components/RecipeList');
    render(<RecipeList recipes={mockRecipes} allTags={allTags} />);

    expect(screen.getByText(/Rezepte mit Tag:/)).toBeInTheDocument();
    expect(screen.getByText('Alle Rezepte anzeigen →')).toBeInTheDocument();
  });

  it('shows empty state when no recipes match tag', async () => {
    const { useSearchParams } = await import('next/navigation');
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams('tag=unbekannt'));

    const { default: RecipeList } = await import('@/components/RecipeList');
    render(<RecipeList recipes={mockRecipes} allTags={allTags} />);

    expect(
      screen.getByText(/Keine Rezepte mit dem Tag "unbekannt" gefunden/)
    ).toBeInTheDocument();
  });

  it('clears filter and navigates when "Alle Rezepte anzeigen" is clicked', async () => {
    const { useSearchParams } = await import('next/navigation');
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams('tag=italienisch'));

    const { default: RecipeList } = await import('@/components/RecipeList');
    render(<RecipeList recipes={mockRecipes} allTags={allTags} />);

    fireEvent.click(screen.getByText('Alle Rezepte anzeigen →'));
    expect(pushMock).toHaveBeenCalledWith('/rezepte');
  });

  it('highlights active tag pill when tag is selected', async () => {
    const { useSearchParams } = await import('next/navigation');
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams('tag=italienisch'));

    const { default: RecipeList } = await import('@/components/RecipeList');
    render(<RecipeList recipes={mockRecipes} allTags={allTags} />);

    // Find the italian filter pill in the filter section (first 3 buttons are the filter pills)
    const pills = screen.getAllByRole('button');
    const italianPill = pills.find(
      (btn) => btn.textContent === 'italienisch' && btn.className.includes('text-sm')
    );
    expect(italianPill).toBeDefined();
    expect(italianPill?.className).toContain('bg-cyan-500');
  });

  it('filters recipes by clicking a tag pill', async () => {
    const { useSearchParams } = await import('next/navigation');
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());

    const { default: RecipeList } = await import('@/components/RecipeList');
    render(<RecipeList recipes={mockRecipes} allTags={allTags} />);

    // Click the amerikanisch filter pill (find it by text and filter-pill class)
    const pills = screen.getAllByRole('button');
    const amerikanischPill = pills.find(
      (btn) => btn.textContent === 'amerikanisch' && btn.className.includes('text-sm')
    );
    fireEvent.click(amerikanischPill!);
    expect(pushMock).toHaveBeenCalledWith('/rezepte?tag=amerikanisch');
  });
});
