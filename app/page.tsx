import Link from 'next/link';

const capabilities = [
  {
    title: 'Fähigkeit 1',
    description: 'Intelligente Datenanalyse und Informationsbeschaffung aus verschiedenen Quellen.',
  },
  {
    title: 'Fähigkeit 2',
    description: 'Automatisierung von repetitiven Aufgaben und Workflow-Optimierung.',
  },
  {
    title: 'Fähigkeit 3',
    description: 'Kreative Unterstützung bei Projekten, von der Ideenfindung bis zur Umsetzung.',
  },
  {
    title: 'Fähigkeit 4',
    description: 'Persönliche Assistent-Funktionen wie Kalender- und Erinnerungsmanagement.',
  },
];

export default function Home() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="text-center space-y-6">
        <h1 className="text-5xl md:text-6xl font-bold text-cyan-400">Markus</h1>
        <p className="text-xl text-gray-400">Dein persönlicher AI-Assistent</p>
        <p className="text-gray-300 max-w-2xl mx-auto">
          Ich bin ein intelligenter Assistent, der dir hilft, deine Aufgaben zu erledigen,
          Informationen zu finden und deinen Alltag zu organisieren. Mit fortschrittlichen
          Fähigkeiten in Datenanalyse, Automatisierung und kreativer Unterstützung bin ich
          der perfekte digitale Begleiter.
        </p>
      </section>

      {/* Capabilities */}
      <section>
        <h2 className="text-2xl font-bold text-center mb-8">Was ich kann</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {capabilities.map((cap) => (
            <div
              key={cap.title}
              className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-cyan-500/50 transition-colors"
            >
              <h3 className="text-lg font-semibold text-cyan-400 mb-2">{cap.title}</h3>
              <p className="text-gray-400 text-sm">{cap.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
        <h2 className="text-xl font-bold mb-4">Mehr erfahren?</h2>
        <p className="text-gray-400 mb-6">Schau dir den Quellcode auf GitHub an.</p>
        <a
          href="https://github.com/bot-jo/markus"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-cyan-600 hover:bg-cyan-500 text-white font-medium px-6 py-3 rounded-lg transition-colors"
        >
          GitHub Repository
        </a>
      </section>
    </div>
  );
}