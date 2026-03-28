import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import RecipeList from '@/components/RecipeList';

const recipesDirectory = path.join(process.cwd(), 'content/rezepte');

interface RecipeMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  servings: number;
  prepTime: string;
  tags: string[];
}

function getRecipeFiles(): string[] {
  if (!fs.existsSync(recipesDirectory)) {
    return [];
  }
  return fs.readdirSync(recipesDirectory).filter((file) => file.endsWith('.md'));
}

function getRecipeMeta(slug: string): RecipeMeta | null {
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

export default function RezeptePage() {
  const files = getRecipeFiles();
  const recipes = files
    .map((file) => getRecipeMeta(file.replace('.md', '')))
    .filter((r): r is RecipeMeta => r !== null);

  if (recipes.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-lg">Noch keine Rezepte vorhanden.</p>
      </div>
    );
  }

  const allTags = Array.from(
    new Set(recipes.flatMap((r) => r.tags))
  ).sort();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Rezepte</h1>
      <RecipeList recipes={recipes} allTags={allTags} />
    </div>
  );
}
