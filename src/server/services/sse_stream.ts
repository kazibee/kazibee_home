export interface SseSink {
  write(chunk: string): boolean;
  end(): void;
  readonly writableEnded: boolean;
  onClose(callback: () => void): void;
}

export function createSseStream(): { response: Response; sink: SseSink } {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
  let ended = false;
  const closeCallbacks = new Set<() => void>();

  const notifyClose = () => {
    if (ended) return;
    ended = true;
    for (const callback of closeCallbacks) callback();
    closeCallbacks.clear();
  };

  const readable = new ReadableStream<Uint8Array>({
    start(value) {
      controller = value;
      value.enqueue(encoder.encode(": connected\n\n"));
    },
    cancel() {
      notifyClose();
    },
  });

  const sink: SseSink = {
    write(chunk) {
      if (ended || !controller) return false;
      controller.enqueue(encoder.encode(chunk));
      return true;
    },
    end() {
      if (ended) return;
      controller?.close();
      notifyClose();
    },
    get writableEnded() {
      return ended;
    },
    onClose(callback) {
      if (ended) callback();
      else closeCallbacks.add(callback);
    },
  };

  return {
    response: new Response(readable, {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
        "x-accel-buffering": "no",
      },
    }),
    sink,
  };
}
