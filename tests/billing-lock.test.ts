import { describe, it, expect, beforeEach } from 'vitest';
import { billingLock } from '@/lib/billing/billing-lock';

describe('Distributed Billing Mutex & Concurrency Lock', () => {
  beforeEach(() => {
    billingLock.forceRelease();
  });

  it('acquires lock when free and blocks concurrent attempts', () => {
    const firstAcquire = billingLock.acquire('worker-1', 5000);
    expect(firstAcquire.acquired).toBe(true);
    expect(firstAcquire.lock).toBeDefined();

    // Second concurrent attempt must fail
    const secondAcquire = billingLock.acquire('worker-2', 5000);
    expect(secondAcquire.acquired).toBe(false);
    expect(secondAcquire.error).toContain('already executing');

    // Status check
    const status = billingLock.getStatus();
    expect(status.isLocked).toBe(true);
    expect(status.lock?.actorId).toBe('worker-1');

    // Release by correct lockId succeeds
    const released = billingLock.release(firstAcquire.lock!.lockId);
    expect(released).toBe(true);

    // After release, new acquire succeeds
    const thirdAcquire = billingLock.acquire('worker-2', 5000);
    expect(thirdAcquire.acquired).toBe(true);
  });

  it('reclaims expired lock automatically after TTL', () => {
    // Acquire with short TTL (10ms)
    const first = billingLock.acquire('worker-fast', 10);
    expect(first.acquired).toBe(true);

    // Busy wait past TTL
    const start = Date.now();
    while (Date.now() - start < 25) {
      // wait 25ms
    }

    // Now second acquire should reclaim the expired lock
    const second = billingLock.acquire('worker-reclaim', 5000);
    expect(second.acquired).toBe(true);
    expect(second.lock?.actorId).toBe('worker-reclaim');
  });
});

