'use client';

import { useState, useEffect } from 'react';
import { addItem, removeItem, getItems } from './actions';

export default function Einkaufsliste() {
  const [items, setItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getItems().then((items) => {
      setItems(items);
      setLoading(false);
    });
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newItem.trim()) return;
    const formData = new FormData();
    formData.set('item', newItem);
    const result = await addItem(formData);
    setItems(result.items);
    setNewItem('');
  }

  async function handleRemove(item: string) {
    const formData = new FormData();
    formData.set('item', item);
    const result = await removeItem(formData);
    setItems(result.items);
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-3xl font-bold text-cyan-400 mb-8">Einkaufsliste</h1>

      {/* Add form */}
      <form onSubmit={handleAdd} className="flex gap-3 mb-8">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Neuer Eintrag..."
          className="flex-1 px-4 py-2 rounded-lg border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <button
          type="submit"
          className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors"
        >
          +
        </button>
      </form>

      {/* Items list */}
      {loading ? (
        <p className="text-gray-400">Laden...</p>
      ) : items.length === 0 ? (
        <div className="text-center py-12 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-gray-400">Keine Einträge vorhanden.</p>
          <p className="text-gray-500 text-sm mt-1">Füge oben etwas hinzu!</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li
              key={i}
              className="flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <span className="text-gray-800 dark:text-gray-100">{item}</span>
              <button
                onClick={() => handleRemove(item)}
                className="text-gray-400 hover:text-red-500 transition-colors text-lg"
                aria-label={`${item} entfernen`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
