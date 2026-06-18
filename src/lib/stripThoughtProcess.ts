export function stripThoughtProcessTransform() {
  let buffer = "";
  let stripping = false;

  return new TransformStream<string, string>({
    transform(chunk, controller) {
      buffer += chunk;

      while (true) {
        if (stripping) {
          const closeIdx = buffer.indexOf("</thought_process>");
          if (closeIdx === -1) {
            if (buffer.length > 20_000) {
              stripping = false;
              controller.enqueue(buffer);
              buffer = "";
            }
            return;
          }
          buffer = buffer.slice(closeIdx + "</thought_process>".length);
          stripping = false;
        } else {
          const openIdx = buffer.indexOf("<thought_process>");
          if (openIdx === -1) {
            const HOLD = "<thought_process>".length - 1;
            if (buffer.length > HOLD) {
              controller.enqueue(buffer.slice(0, buffer.length - HOLD));
              buffer = buffer.slice(buffer.length - HOLD);
            }
            return;
          }
          if (openIdx > 0) {
            controller.enqueue(buffer.slice(0, openIdx));
          }
          buffer = buffer.slice(openIdx + "<thought_process>".length);
          stripping = true;
        }
      }
    },

    flush(controller) {
      if (!stripping && buffer.length > 0) {
        controller.enqueue(buffer);
      }
      buffer = "";
    },
  });
}
