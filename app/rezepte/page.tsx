import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

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

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Rezepte</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recipes.map((recipe) => (
          <Link
            key={recipe.slug}
            href={`/markus/rezepte/${recipe.slug}`}
            className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-cyan-500/50 transition-colors block"
          >
            <h2 className="text-xl font-semibold text-cyan-400 mb-2">{recipe.title}</h2>
            <p className="text-gray-400 text-sm mb-4">{recipe.description}</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {recipe.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="text-xs text-gray-500 flex gap-4">
              <span>⏱ {recipe.prepTime}</span>
              <span>🍽 {recipe.servings} Portionen</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}