// rendering application: LiveCallPolicy (Impl 021) — the injected, fail-closed switch that governs whether a
// LiveProviderClient may perform a real provider call. It is a plain value object: DISABLED BY DEFAULT, with
// `enabled` only ever set deliberately by the composer. It is NEVER inferred from the environment in
// application logic (no environment-variable reads), holds no global state, and carries no secret. When disabled, the live
// client performs no call and returns a safe failure — and no domain behavior changes either way.

const DEFAULT_TIMEOUT_MS = 30_000; // advisory only this slice; used for AbortSignal.timeout in the transport

export interface LiveCallPolicy {
  readonly enabled: boolean;
  readonly timeoutMs: number;
  /** optional descriptive label for who/why enabled it — NEVER a secret */
  readonly source?: string;
}

export const LiveCallPolicy = Object.freeze({
  /** the default: live calls OFF. */
  disabled(): LiveCallPolicy {
    return Object.freeze({ enabled: false, timeoutMs: DEFAULT_TIMEOUT_MS });
  },
  /** explicit opt-in: live calls ON. `enabled` must be set deliberately, never inferred. */
  enabled(opts?: { readonly timeoutMs?: number; readonly source?: string }): LiveCallPolicy {
    return Object.freeze({
      enabled: true,
      timeoutMs: opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      ...(opts?.source !== undefined ? { source: opts.source } : {}),
    });
  },
});
