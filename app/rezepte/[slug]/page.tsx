import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkHtml from 'remark-html';
import Link from 'next/link';

const recipesDirectory = path.join(process.cwd(), 'content/rezepte');

interface RecipeFrontmatter {
  title: string;
  description?: string;
  servings?: number;
  prepTime?: string;
  tags?: string[];
  date?: string;
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  if (!fs.existsSync(recipesDirectory)) {
    return [];
  }
  const files = fs.readdirSync(recipesDirectory).filter((file) => file.endsWith('.md'));
  return files.map((file) => ({
    slug: file.replace('.md', ''),
  }));
}

async function getRecipeContent(slug: string): Promise<{
  content: string;
  data: RecipeFrontmatter;
} | null> {
  const filePath = path.join(recipesDirectory, `${slug}.md`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data: rawData, content } = matter(fileContents);
  const data = rawData as RecipeFrontmatter;

  const processedContent = await remark().use(remarkHtml).process(content);
  const contentHtml = processedContent.toString();

  return { content: contentHtml, data };
}

export default async function RecipePage({ params }: PageProps) {
  const { slug } = await params;
  const recipe = await getRecipeContent(slug);

  if (!recipe) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <p className="text-gray-400 text-lg">Rezept nicht gefunden.</p>
        <Link
          href="/rezepte"
          className="text-cyan-400 hover:underline mt-4 inline-block"
        >
          ← Zurück zu Rezepten
        </Link>
      </div>
    );
  }

  const { content, data } = recipe;

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      {/* Back link */}
      <Link
        href="/rezepte"
        className="text-gray-500 hover:text-cyan-400 text-sm mb-6 inline-block transition-colors"
      >
        ← Alle Rezepte
      </Link>

      {/* Title */}
      <h1 className="text-3xl font-bold text-white mb-6">{data.title}</h1>

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-3 mb-8 pb-6 border-b border-gray-800">
        {data.prepTime && (
          <span className="inline-flex items-center gap-1.5 bg-cyan-900/40 text-cyan-300 text-sm px-3 py-1.5 rounded-full">
            <span>⏱️</span>
            <span>{data.prepTime}</span>
          </span>
        )}
        {data.servings && (
          <span className="inline-flex items-center gap-1.5 bg-emerald-900/40 text-emerald-300 text-sm px-3 py-1.5 rounded-full">
            <span>🍽️</span>
            <span>{data.servings} Portionen</span>
          </span>
        )}
        <div className="flex flex-wrap gap-2">
          {data.tags?.map((tag: string) => (
            <span
              key={tag}
              className="bg-purple-900/40 text-purple-300 text-xs px-2 py-1 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Description from frontmatter */}
      {data.description && (
        <p className="text-gray-300 text-lg leading-relaxed mb-8">
          {data.description}
        </p>
      )}

      {/* Rendered markdown content */}
      <div
        className="prose prose-invert prose-cyan max-w-none
          prose-headings:text-white prose-headings:font-semibold
          prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-gray-800
          prose-p:text-gray-300 prose-p:leading-relaxed
          prose-ul:my-4 prose-ul:space-y-2
          prose-li:text-gray-300 prose-li:marker:text-cyan-400
          prose-ol:my-4 prose-ol:space-y-3
          prose-li:marker:text-cyan-400 prose-li:marker:font-bold
          prose-strong:text-white prose-strong:font-semibold
          prose-a:text-cyan-400 prose-a:underline
          prose-blockquote:border-l-cyan-400 prose-blockquote:text-gray-400
          prose-code:text-cyan-300 prose-code:bg-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
          prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-800"
        dangerouslySetInnerHTML={{ __html: content }}
      />

    </div>
  );
}
