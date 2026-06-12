import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";
import { sendTransactionalEmail } from "./email.server";

export const submitContactFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(1).max(100),
      email: z.string().email().max(200),
      subject: z.string().max(200).optional(),
      category: z.enum([
        "general", "bug", "billing", "account",
        "curriculum", "partnership", "press", "other",
      ]),
      message: z.string().min(1).max(5000),
    })
  )
  .handler(async ({ data }) => {
    // CS-XSS-002: Escape all user-supplied values before inserting into HTML emails
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

    // 1. Save to DB
    const { error } = await supabaseAdmin
      .from("contact_messages")
      .insert({
        name: data.name,
        email: data.email,
        subject: data.subject ?? null,
        category: data.category,
        message: data.message,
      });

    if (error) {
      console.error("[Contact] DB insert failed:", error.message);
      throw new Error("Failed to save message. Please try again.");
    }

    // 2. Notify admin
    const adminEmail = process.env.ADMIN_EMAIL || "onungaelly@gmail.com";
    await sendTransactionalEmail({
      to: adminEmail,
      subject: `[GilaniAI Contact] ${data.category} — ${data.subject || data.name}`,
      html: `
        <h2>New contact message</h2>
        <p><strong>Name:</strong> ${esc(data.name)}</p>
        <p><strong>Email:</strong> ${esc(data.email)}</p>
        <p><strong>Category:</strong> ${esc(data.category)}</p>
        <p><strong>Subject:</strong> ${esc(data.subject || "—")}</p>
        <hr/>
        <p>${esc(data.message).replace(/\n/g, "<br/>")}</p>
      `,
      text: `Name: ${data.name}\nEmail: ${data.email}\nCategory: ${data.category}\nSubject: ${data.subject || "—"}\n\n${data.message}`,
    });

    // 3. Auto-reply to sender
    await sendTransactionalEmail({
      to: data.email,
      subject: "We received your message — GilaniAI Support",
      html: `
        <p>Hi ${data.name},</p>
        <p>Thanks for reaching out! We've received your message and will get back to you within 24 hours (Mon–Fri).</p>
        <p>If your matter is urgent, you can also email us directly at <a href="mailto:support@gilaniai.vercel.app">support@gilaniai.vercel.app</a>.</p>
        <br/>
        <p>— The GilaniAI Team</p>
      `,
      text: `Hi ${data.name},\n\nThanks for reaching out! We've received your message and will get back to you within 24 hours (Mon–Fri).\n\n— The GilaniAI Team`,
    });

    return { ok: true };
  });
