/**
 * Concurrency Lock / Mutex for Automated Billing Runs.
 * Prevents overlapping billing batch executions across concurrent API calls,
 * distributed worker nodes, or simultaneous administrator triggers.
 */

export interface BillingLockInfo {
  lockId: string;
  actorId: string;
  acquiredAt: string;
  expiresAt: string;
}

class BillingLockService {
  private activeLock: BillingLockInfo | null = null;
  private defaultTtlMs: number = 60000; // 60 seconds lease TTL

  /**
   * Attempt to acquire an exclusive lock for running a billing batch.
   * If a lock is active and has not expired, returns false.
   */
  acquire(actorId: string = 'system', ttlMs: number = this.defaultTtlMs): {
    acquired: boolean;
    lock?: BillingLockInfo;
    error?: string;
  } {
    const now = Date.now();

    if (this.activeLock) {
      const expiresAtMs = new Date(this.activeLock.expiresAt).getTime();
      if (now < expiresAtMs) {
        return {
          acquired: false,
          error: `A billing batch is already executing (Lock ID: ${this.activeLock.lockId}, acquired by: ${this.activeLock.actorId} at ${this.activeLock.acquiredAt}).`,
        };
      }
      // Lock has expired; reclaim it
    }

    const lock: BillingLockInfo = {
      lockId: `lock-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      actorId,
      acquiredAt: new Date(now).toISOString(),
      expiresAt: new Date(now + ttlMs).toISOString(),
    };

    this.activeLock = lock;
    return { acquired: true, lock };
  }

  /**
   * Release the active lock if the provided lockId matches.
   */
  release(lockId: string): boolean {
    if (!this.activeLock) return true;
    if (this.activeLock.lockId === lockId) {
      this.activeLock = null;
      return true;
    }
    return false;
  }

  /**
   * Check if a billing batch is currently running and locked.
   */
  getStatus(): { isLocked: boolean; lock: BillingLockInfo | null } {
    if (!this.activeLock) {
      return { isLocked: false, lock: null };
    }

    const now = Date.now();
    const expiresAtMs = new Date(this.activeLock.expiresAt).getTime();
    if (now >= expiresAtMs) {
      this.activeLock = null;
      return { isLocked: false, lock: null };
    }

    return { isLocked: true, lock: this.activeLock };
  }

  /**
   * Force clear the lock (emergency override for admin troubleshooting).
   */
  forceRelease(): void {
    this.activeLock = null;
  }
}

// Global singleton
const globalForLock = globalThis as unknown as { billingLock: BillingLockService };
export const billingLock = globalForLock.billingLock || new BillingLockService();
if (process.env.NODE_ENV !== 'production') globalForLock.billingLock = billingLock;

