// Linked to: US-009, US-017, US-018
import { render, screen } from '@testing-library/react';

// Mock remark and remark-html before importing the page
jest.mock('remark', () => {
  return {
    remark: jest.fn(() => ({
      use: jest.fn().mockReturnThis(),
      process: jest.fn().mockResolvedValue({
        toString: () =>
          '<h2>Beschreibung</h2><p>Ein einfaches Beispielrezept zum Testen.</p><h2>Zutaten</h2><ul><li>200g Nudeln</li><li>1 Zwiebel</li><li>Salz, Pfeffer</li></ul><h2>Zubereitung</h2><ol><li>Wasser kochen</li><li>Nudeln kochen</li><li>Servieren</li></ol><h2>Anmerkungen</h2><p>Guten Appetit!</p>',
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

## Beschreibung

Ein einfaches Beispielrezept zum Testen.

## Zutaten
- 200g Nudeln
- 1 Zwiebel
- Salz, Pfeffer

## Zubereitung
1. Wasser kochen
2. Nudeln kochen
3. Servieren

## Anmerkungen

Guten Appetit!`;
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

  it('renders all five sections: Beschreibung, Zutaten, Zubereitung, Anmerkungen', async () => {
    render(await RecipeDetailPage({ params: mockParams }));
    expect(screen.getByText('Beschreibung')).toBeInTheDocument();
    expect(screen.getByText('Zutaten')).toBeInTheDocument();
    expect(screen.getByText('Zubereitung')).toBeInTheDocument();
    expect(screen.getByText('Anmerkungen')).toBeInTheDocument();
  });

  it('renders recipe metadata: prepTime and servings', async () => {
    render(await RecipeDetailPage({ params: mockParams }));
    expect(screen.getByText('30 Minuten')).toBeInTheDocument();
    expect(screen.getByText(/4.*Portionen|4 Portionen/)).toBeInTheDocument();
  });

  it('renders back link to /rezepte', async () => {
    render(await RecipeDetailPage({ params: mockParams }));
    const backLink = screen.getByRole('link', { name: /alle rezepte/i });
    expect(backLink).toHaveAttribute('href', '/rezepte');
  });
});
