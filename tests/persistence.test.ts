import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PersistentStore } from '@/lib/store';
import fs from 'node:fs';
import path from 'node:path';

describe('Real-World Persistence Engine', () => {
  const testStorageDir = path.join(process.cwd(), '.data', 'test-run');
  const testStoragePath = path.join(testStorageDir, 'test-store.json');

  beforeEach(() => {
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }
  });

  it('atomically writes store data to disk and reloads on startup', () => {
    const storeInstance = new PersistentStore(testStoragePath);

    // Verify initial file was created
    expect(fs.existsSync(testStoragePath)).toBe(true);

    // Add a custom customer and persist
    storeInstance.customers.set('cust-test-persistence', {
      id: 'cust-test-persistence',
      name: 'Persistent Corp',
      email: 'admin@persistent.io',
      createdAt: '2026-10-31T00:00:00.000Z',
      updatedAt: '2026-10-31T00:00:00.000Z',
    });
    storeInstance.persist();

    // Verify written file is valid JSON
    const rawContent = fs.readFileSync(testStoragePath, 'utf-8');
    const parsed = JSON.parse(rawContent);
    expect(parsed.customers.some((c: any) => c.id === 'cust-test-persistence')).toBe(true);

    // Create a new independent instance pointing to the same storage path
    const restoredStore = new PersistentStore(testStoragePath);
    expect(restoredStore.customers.has('cust-test-persistence')).toBe(true);
    expect(restoredStore.customers.get('cust-test-persistence')?.name).toBe('Persistent Corp');
  });

  it('resets cleanly to seed data when requested', () => {
    const storeInstance = new PersistentStore(testStoragePath);
    storeInstance.customers.set('temp-cust', {
      id: 'temp-cust',
      name: 'Temp',
      email: 't@t.com',
      createdAt: '2026-10-31T00:00:00.000Z',
      updatedAt: '2026-10-31T00:00:00.000Z',
    });
    storeInstance.persist();
    expect(storeInstance.customers.has('temp-cust')).toBe(true);

    storeInstance.reset();
    expect(storeInstance.customers.has('temp-cust')).toBe(false);
    expect(storeInstance.customers.has('cust-101')).toBe(true);
  });
});

