import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/stream-test")({
  server: {
    handlers: {
      GET: async () => {
        const encoder = new TextEncoder();
        let i = 0;
        const stream = new ReadableStream({
          async start(controller) {
            const interval = setInterval(() => {
              i++;
              const payload = `data: tick ${i} at ${Date.now()}\n\n`;
              controller.enqueue(encoder.encode(payload));
              if (i >= 20) {
                clearInterval(interval);
                controller.close();
              }
            }, 200);
          },
        });
        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
