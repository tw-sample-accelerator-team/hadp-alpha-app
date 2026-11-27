export interface DatabaseProbe {
  /** Resolves true when the database answers, false otherwise. Never throws. */
  isReachable(): Promise<boolean>;
}
