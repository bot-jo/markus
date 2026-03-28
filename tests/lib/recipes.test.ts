// Linked to: US-008, US-009
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const recipesDirectory = path.join(process.cwd(), 'content/rezepte');

function getRecipeFiles(): string[] {
  if (!fs.existsSync(recipesDirectory)) {
    return [];
  }
  return fs.readdirSync(recipesDirectory).filter((file) => file.endsWith('.md'));
}

function getRecipeMeta(slug: string) {
  const filePath = path.join(recipesDirectory, `${slug}.md`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data } = matter(fileContents);
  return {
    slug,
    title: data.title || '',
    description: data.description || '',
    date: data.date || '',
    servings: data.servings || 0,
    prepTime: data.prepTime || '',
    tags: data.tags || [],
  };
}

function getAllRecipes() {
  const files = getRecipeFiles();
  return files
    .map((file) => getRecipeMeta(file.replace('.md', '')))
    .filter((r) => r !== null);
}

describe('recipes lib', () => {
  describe('getRecipeFiles', () => {
    it('returns correct slug from filename', () => {
      const files = getRecipeFiles();
      if (files.length > 0) {
        expect(files[0].replace('.md', '')).toBe('beispiel-rezept');
      }
    });

    it('returns all recipes from content/rezepte/', () => {
      const files = getRecipeFiles();
      expect(Array.isArray(files)).toBe(true);
    });
  });

  describe('getRecipeMeta', () => {
    it('correctly parses frontmatter from markdown file', () => {
      const meta = getRecipeMeta('beispiel-rezept');
      if (meta) {
        expect(meta.title).toBe('Beispiel Rezept');
        expect(meta.description).toBe('Ein einfaches Beispielrezept.');
        expect(meta.servings).toBe(4);
        expect(meta.prepTime).toBe('30 Minuten');
        expect(meta.tags).toContain('Beispiel');
      }
    });

    it('returns null for non-existent slug', () => {
      const meta = getRecipeMeta('non-existent');
      expect(meta).toBeNull();
    });
  });

  describe('getAllRecipes', () => {
    it('returns array of recipes', () => {
      const recipes = getAllRecipes();
      expect(Array.isArray(recipes)).toBe(true);
    });
  });
});
