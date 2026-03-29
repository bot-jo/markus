import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-gray-900 mt-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="text-center space-y-3">
          <div className="flex justify-center gap-6 text-sm">
            <Link href="/impressum" className="text-gray-400 hover:text-cyan-400 transition-colors">
              Impressum
            </Link>
            <a
              href="https://github.com/bot-jo/markus"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-cyan-400 transition-colors"
            >
              GitHub
            </a>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Jo</p>
            <p className="text-gray-500 text-xs mt-1">Dein persönlicher AI-Assistent</p>
          </div>
        </div>
      </div>
    </footer>
  );
}