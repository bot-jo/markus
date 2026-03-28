// Linked to: US-009
import { render, screen } from '@testing-library/react';

// Mock remark and remark-html before importing the page
jest.mock('remark', () => {
  return {
    remark: jest.fn(() => ({
      use: jest.fn().mockReturnThis(),
      process: jest.fn().mockResolvedValue({
        toString: () => '<h2>Zutaten</h2><h2>Zubereitung</h2>',
      }),
    })),
  };
});

jest.mock('remark-html', () => jest.fn());

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn((path: string) => path.includes('content/rezepte')),
  readdirSync: jest.fn(() => ['beispiel-rezept.md']),
  readFileSync: jest.fn((path: string) => {
    if (path.includes('beispiel-rezept.md')) {
      return `---
title: "Beispiel Rezept"
description: "Ein einfaches Beispielrezept."
date: "2025-01-01"
servings: 4
prepTime: "30 Minuten"
tags: ["Beispiel", "Einfach"]
---

## Zutaten
- 200g Nudeln
- 1 Zwiebel
- Salz, Pfeffer

## Zubereitung
1. Wasser kochen
2. Nudeln kochen
3. Servieren`;
    }
    return '';
  }),
}));

import RecipeDetailPage from '@/app/rezepte/[slug]/page';

const mockParams = Promise.resolve({ slug: 'beispiel-rezept' });

describe('RezepteDetail', () => {
  it('renders recipe title from frontmatter', async () => {
    render(await RecipeDetailPage({ params: mockParams }));
    expect(screen.getByText('Beispiel Rezept')).toBeInTheDocument();
  });

  it('renders recipe metadata: servings, prepTime, date', async () => {
    render(await RecipeDetailPage({ params: mockParams }));
    expect(screen.getByText(/2025-01-01/)).toBeInTheDocument();
    expect(screen.getByText(/30 Minuten/)).toBeInTheDocument();
    expect(screen.getByText(/Portionen/)).toBeInTheDocument();
  });

  it('renders recipe body content as HTML', async () => {
    render(await RecipeDetailPage({ params: mockParams }));
    expect(screen.getByText('Zutaten')).toBeInTheDocument();
    expect(screen.getByText('Zubereitung')).toBeInTheDocument();
  });

  it('renders back link to /rezepte', async () => {
    render(await RecipeDetailPage({ params: mockParams }));
    const backLink = screen.getByRole('link', { name: /zurück zu rezepten/i });
    expect(backLink).toHaveAttribute('href', '/rezepte');
  });
});
