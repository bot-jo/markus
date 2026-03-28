'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface RecipeMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  servings: number;
  prepTime: string;
  tags: string[];
}

interface RecipeListProps {
  recipes: RecipeMeta[];
  allTags: string[];
}

export default function RecipeList({ recipes, allTags }: RecipeListProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTag = searchParams.get('tag') || '';

  const filteredRecipes = activeTag
    ? recipes.filter((r) => r.tags.includes(activeTag))
    : recipes;

  const handleTagClick = (tag: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (activeTag === tag) {
      params.delete('tag');
    } else {
      params.set('tag', tag);
    }
    const query = params.toString();
    router.push(`/rezepte${query ? `?${query}` : ''}`);
  };

  const handleClearFilter = () => {
    router.push('/rezepte');
  };

  return (
    <div>
      {/* Tag Filter Pills */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {allTags.map((tag) => {
            const isActive = activeTag === tag;
            return (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className={`text-sm px-3 py-1.5 rounded-full transition-colors ${
                  isActive
                    ? 'bg-cyan-500 text-black font-medium'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}

      {/* Active Filter Indicator */}
      {activeTag && (
        <div className="flex items-center gap-3 mb-6 text-sm">
          <span className="text-gray-400">
            Rezepte mit Tag: <span className="text-cyan-400 font-medium">{activeTag}</span>
          </span>
          <button
            onClick={handleClearFilter}
            className="text-cyan-400 hover:text-cyan-300 hover:underline"
          >
            Alle Rezepte anzeigen →
          </button>
        </div>
      )}

      {/* Recipe Grid */}
      {filteredRecipes.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg">
            Keine Rezepte mit dem Tag &quot;{activeTag}&quot; gefunden.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
            <Link
              key={recipe.slug}
              href={`/rezepte/${recipe.slug}`}
              className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-cyan-500/50 transition-colors block"
            >
              <h2 className="text-xl font-semibold text-cyan-400 mb-2">{recipe.title}</h2>
              <p className="text-gray-400 text-sm mb-4">{recipe.description}</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {recipe.tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={(e) => {
                      e.preventDefault();
                      handleTagClick(tag);
                    }}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      activeTag === tag
                        ? 'bg-cyan-500 text-black'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <div className="text-xs text-gray-500 flex gap-4">
                <span>⏱ {recipe.prepTime}</span>
                <span>🍽 {recipe.servings} Portionen</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
