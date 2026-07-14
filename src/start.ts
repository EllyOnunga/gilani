import { createStart, createMiddleware } from "@tanstack/react-start";
import { renderErrorPage } from "@/shared/utils/error-page";
import { attachSupabaseAuth } from "@/shared/auth/auth-attacher";

const CSRF_EXEMPT_PATHS = ["/api/mpesa/callback", "/api/notifications/digest"];

const UNSAFE_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

const csrfMiddleware = createMiddleware().server(async ({ next, request }) => {
  const pathname = new URL(request.url).pathname;
  const isExempt = CSRF_EXEMPT_PATHS.some((p) => pathname.startsWith(p));

  if (UNSAFE_METHODS.includes(request.method) && !isExempt) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");

    if (!origin || !host) {
      return new Response("Forbidden: missing origin", { status: 403 });
    }

    const originHost = new URL(origin).host;
    if (originHost !== host) {
      return new Response("Forbidden: CSRF check failed", { status: 403 });
    }
  }
  return next();
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware, errorMiddleware], // csrf first
  functionMiddleware: [attachSupabaseAuth],
}));
