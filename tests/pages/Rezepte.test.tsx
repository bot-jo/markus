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
    expect(pills.length).toBeGreaterThanOrEqual(3);
  });

  it('shows active filter summary when tags are selected', async () => {
    const { useSearchParams } = await import('next/navigation');
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams('tags=italienisch'));

    const { default: RecipeList } = await import('@/components/RecipeList');
    render(<RecipeList recipes={mockRecipes} allTags={allTags} />);

    expect(screen.getByText(/Zeige Rezepte mit:/)).toBeInTheDocument();
    expect(screen.getAllByText('italienisch').length).toBeGreaterThan(0);
    expect(screen.getByText('Filter zurücksetzen ✕')).toBeInTheDocument();
  });

  it('shows empty state when no recipes match tag combination', async () => {
    const { useSearchParams } = await import('next/navigation');
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams('tags=unbekannt'));

    const { default: RecipeList } = await import('@/components/RecipeList');
    render(<RecipeList recipes={mockRecipes} allTags={allTags} />);

    expect(screen.getByText(/Keine Rezepte gefunden/)).toBeInTheDocument();
    expect(screen.getByText('Filter zurücksetzen →')).toBeInTheDocument();
  });

  it('clears filter and navigates when "Filter zurücksetzen" is clicked', async () => {
    const { useSearchParams } = await import('next/navigation');
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams('tags=italienisch'));

    const { default: RecipeList } = await import('@/components/RecipeList');
    render(<RecipeList recipes={mockRecipes} allTags={allTags} />);

    fireEvent.click(screen.getByText('Filter zurücksetzen ✕'));
    expect(pushMock).toHaveBeenCalledWith('/rezepte');
  });

  it('highlights active tag pill when tag is selected', async () => {
    const { useSearchParams } = await import('next/navigation');
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams('tags=italienisch'));

    const { default: RecipeList } = await import('@/components/RecipeList');
    render(<RecipeList recipes={mockRecipes} allTags={allTags} />);

    const pills = screen.getAllByRole('button');
    const italianPill = pills.find((btn) => btn.textContent === 'italienisch');
    expect(italianPill?.className).toContain('bg-cyan-500');
  });

  it('adds tag to URL when clicking a tag pill', async () => {
    const { useSearchParams } = await import('next/navigation');
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());

    const { default: RecipeList } = await import('@/components/RecipeList');
    render(<RecipeList recipes={mockRecipes} allTags={allTags} />);

    const pills = screen.getAllByRole('button');
    const amerikanischPill = pills.find((btn) => btn.textContent === 'amerikanisch');
    fireEvent.click(amerikanischPill!);
    expect(pushMock).toHaveBeenCalledWith('/rezepte?tags=amerikanisch');
  });

  it('applies AND filter when two tags are selected', async () => {
    const { useSearchParams } = await import('next/navigation');
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams('tags=italienisch,vegetarisch'));

    const { default: RecipeList } = await import('@/components/RecipeList');
    render(<RecipeList recipes={mockRecipes} allTags={allTags} />);

    // Both pasta and pizza have both tags, burger has none
    expect(screen.getByText('Pasta')).toBeInTheDocument();
    expect(screen.getByText('Pizza')).toBeInTheDocument();
    expect(screen.queryByText('Burger')).not.toBeInTheDocument();
    expect(screen.getByText(/\(2 Tags aktiv\)/)).toBeInTheDocument();
  });

  it('removes tag from filter when clicking an active tag', async () => {
    const { useSearchParams } = await import('next/navigation');
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams('tags=italienisch,vegetarisch'));

    const { default: RecipeList } = await import('@/components/RecipeList');
    render(<RecipeList recipes={mockRecipes} allTags={allTags} />);

    const pills = screen.getAllByRole('button');
    const italianPill = pills.find((btn) => btn.textContent === 'italienisch');
    fireEvent.click(italianPill!);
    expect(pushMock).toHaveBeenCalledWith('/rezepte?tags=vegetarisch');
  });
});
