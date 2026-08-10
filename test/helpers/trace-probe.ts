import {
  getTraceManager,
  type TraceEvent,
  type TraceLevel,
} from "@noego/trace";
import type { Subscription } from "rxjs";

export interface TraceQuery {
  source?: string;
  event?: string;
  level?: TraceLevel;
}

function matches(event: TraceEvent, query: TraceQuery): boolean {
  return (query.source === undefined || event.source === query.source)
    && (query.event === undefined || event.event === query.event)
    && (query.level === undefined || event.level === query.level);
}

/**
 * Test-only subscriber for the synchronous @noego/trace event stream.
 *
 * Each start begins a fresh capture window. Production code has no access to
 * this class or its captured events.
 */
export class TraceProbe {
  private events: TraceEvent[] = [];
  private subscription?: Subscription;

  start(): void {
    if (this.subscription) {
      throw new Error("TraceProbe is already started");
    }

    this.events = [];
    this.subscription = getTraceManager().events$.subscribe(event => {
      this.events.push(event);
    });
  }

  stop(): void {
    this.subscription?.unsubscribe();
    this.subscription = undefined;
  }

  query(query: TraceQuery = {}): readonly TraceEvent[] {
    return this.events.filter(event => matches(event, query));
  }

  count(query: TraceQuery = {}): number {
    return this.query(query).length;
  }

  hasOrderedSubsequence(queries: readonly TraceQuery[]): boolean {
    let nextQuery = 0;
    for (const event of this.events) {
      if (nextQuery < queries.length && matches(event, queries[nextQuery])) {
        nextQuery += 1;
      }
    }
    return nextQuery === queries.length;
  }

  /**
   * Trace delivery is synchronous. A microtask is still awaited so callers
   * have an explicit barrier after an async operation that emitted traces.
   */
  async flush(): Promise<void> {
    await Promise.resolve();
  }
}
