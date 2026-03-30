'use server';

import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'content/einkaufsliste.json');

function readList(): string[] {
  if (!fs.existsSync(DATA_FILE)) return [];
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  return data.items || [];
}

function writeList(items: string[]): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ items }, null, 2));
}

export async function addItem(formData: FormData): Promise<{items: string[]}> {
  const item = formData.get('item')?.toString().trim();
  if (!item) return { items: readList() };
  const items = readList();
  items.push(item);
  writeList(items);
  return { items };
}

export async function removeItem(formData: FormData): Promise<{items: string[]}> {
  const item = formData.get('item')?.toString();
  if (!item) return { items: readList() };
  const items = readList().filter((i) => i !== item);
  writeList(items);
  return { items };
}

export async function getItems(): Promise<string[]> {
  return readList();
}
