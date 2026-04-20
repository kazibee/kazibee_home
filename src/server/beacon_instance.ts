/**
 * Stable IoC token for Beacon injection.
 *
 * Uses Symbol.for() to guarantee the same reference across ESM module
 * boundaries — this avoids the dual-load identity problem where
 * the Beacon class reference differs between import sites.
 */
export const BEACON = Symbol.for('kazibee:beacon');
