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

  const tagsParam = searchParams.get('tags') || '';
  const activeTags: string[] = tagsParam ? tagsParam.split(',').filter(Boolean) : [];

  const filteredRecipes = activeTags.length > 0
    ? recipes.filter((r) => activeTags.every((tag) => r.tags.includes(tag)))
    : recipes;

  const toggleTag = (tag: string) => {
    const params = new URLSearchParams();
    let newActiveTags: string[];
    if (activeTags.includes(tag)) {
      newActiveTags = activeTags.filter((t) => t !== tag);
    } else {
      newActiveTags = [...activeTags, tag];
    }
    if (newActiveTags.length > 0) {
      params.set('tags', newActiveTags.join(','));
    }
    const query = params.toString();
    router.push(`/rezepte${query ? `?${query}` : ''}`);
  };

  const clearAll = () => {
    router.push('/rezepte');
  };

  return (
    <div>
      {/* Tag Filter Pills */}
      {allTags.length > 0 && (
        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-2">Nach Tags filtern:</p>
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => {
              const isActive = activeTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                    isActive
                      ? 'bg-cyan-500 border-cyan-500 text-black font-medium'
                      : 'border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white bg-transparent'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Filter Summary */}
      {activeTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-6 text-sm">
          <span className="text-gray-400">
            Zeige Rezepte mit:{' '}
            <span className="text-cyan-400 font-medium">{activeTags.join(', ')}</span>
          </span>
          {activeTags.length > 1 && (
            <span className="text-gray-600">({activeTags.length} Tags aktiv)</span>
          )}
          <button
            onClick={clearAll}
            className="ml-auto text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1"
          >
            Filter zurücksetzen ✕
          </button>
        </div>
      )}

      {/* Recipe Grid */}
      {filteredRecipes.length === 0 && activeTags.length > 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg mb-3">
            Keine Rezepte gefunden für:{' '}
            <span className="text-cyan-400">{activeTags.join(', ')}</span>
          </p>
          <button
            onClick={clearAll}
            className="text-cyan-400 hover:text-cyan-300 hover:underline"
          >
            Filter zurücksetzen →
          </button>
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
                {recipe.tags.map((tag) => {
                  const isActive = activeTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleTag(tag);
                      }}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${
                        isActive
                          ? 'bg-cyan-500 border-cyan-500 text-black'
                          : 'border-gray-700 text-gray-300 hover:border-gray-500 bg-transparent'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
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
