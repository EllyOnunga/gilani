import { toast } from "sonner";

type Message = {
  role: string;
  parts?: { type: string; text?: string }[];
  content?: string;
};

export async function exportAsPDF(messages: Message[], title: string) {
  if (import.meta.env.SSR) return;
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const maxWidth = pageWidth - margin * 2;
  let y = 20;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("GilaniAI Study Session", margin, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text(`Exported on ${new Date().toLocaleDateString()}`, margin, y);
  y += 10;

  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  messages.forEach((m) => {
    const role = m.role === "user" ? "You" : "GilaniAI";
    const text = m.parts?.find((p) => p.type === "text")?.text || m.content || "";
    const clean = text.replace(/[#*`$]/g, "").trim();

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(m.role === "user" ? 30 : 0, m.role === "user" ? 100 : 150, 255);
    doc.text(role, margin, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(40);
    const lines = doc.splitTextToSize(clean, maxWidth);
    lines.forEach((line: string) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += 5;
    });
    y += 4;
  });

  doc.save(`${title.replace(/\s+/g, "-")}.pdf`);
  toast.success("PDF exported successfully!");
}
