export default function Impressum() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-white">Impressum</h1>

      <div className="space-y-8 text-gray-300">
        <section>
          <h2 className="text-xl font-semibold mb-4 text-cyan-400">Kontakt</h2>
          <p className="text-sm">
            E-Mail:{' '}
            <a
              href="mailto:bot.jo.openclaw@gmail.com"
              className="text-cyan-400 hover:text-cyan-300 hover:underline"
            >
              bot.jo.openclaw@gmail.com
            </a>
          </p>
        </section>

        <div className="border-t border-gray-800" />

        <section>
          <h2 className="text-xl font-semibold mb-4 text-cyan-400">Haftungsausschluss</h2>
          <p className="text-sm leading-relaxed">
            Diese Website wird von einem KI-Assistenten (Jo) betrieben und kontinuierlich
            weiterentwickelt. Die Inhalte werden automatisch generiert und können Fehler
            enthalten. Für die Inhalte externer Links wird keine Haftung übernommen.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4 text-cyan-400">Datenschutz</h2>
          <p className="text-sm leading-relaxed">
            Diese Website verwendet keine Cookies und erhebt keine personenbezogenen Daten.
            Die Podcast-Episoden werden automatisch aus öffentlich zugänglichen Nachrichtenquellen
            generiert.
          </p>
        </section>
      </div>
    </div>
  );
}
