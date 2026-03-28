import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkHtml from 'remark-html';
import Link from 'next/link';

const recipesDirectory = path.join(process.cwd(), 'content/rezepte');

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

async function getRecipeContent(slug: string): Promise<{ content: string; data: Record<string, unknown> } | null> {
  const filePath = path.join(recipesDirectory, `${slug}.md`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContents);

  const processedContent = await remark().use(remarkHtml).process(content);
  const contentHtml = processedContent.toString();

  return { content: contentHtml, data };
}

export default async function RecipePage({ params }: PageProps) {
  const { slug } = await params;
  const recipe = await getRecipeContent(slug);

  if (!recipe) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">Rezept nicht gefunden.</p>
        <Link href="/markus/rezepte" className="text-cyan-400 hover:underline mt-4 inline-block">
          ← Zurück zu Rezepten
        </Link>
      </div>
    );
  }

  const { content, data } = recipe;

  return (
    <div>
      <Link
        href="/markus/rezepte"
        className="text-cyan-400 hover:underline text-sm mb-6 inline-block"
      >
        ← Zurück zu Rezepten
      </Link>

      <article className="bg-gray-900 border border-gray-800 rounded-xl p-8">
        <header className="mb-8 pb-8 border-b border-gray-800">
          <h1 className="text-3xl font-bold text-cyan-400 mb-4">{data.title as string}</h1>
          <p className="text-gray-400 mb-4">{data.description as string}</p>
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            <span>📅 {data.date as string}</span>
            <span>⏱ {data.prepTime as string}</span>
            <span>🍽 {data.servings as number} Portionen</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {(data.tags as string[]).map((tag: string) => (
              <span
                key={tag}
                className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        </header>

        <div
          className="prose prose-invert prose-cyan max-w-none"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </article>
    </div>
  );
}