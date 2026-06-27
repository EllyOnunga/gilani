import React, { useState } from "react";
import { Download, FileDown } from "lucide-react";

type Props = {
  onExportPDF: () => void;
};

export function ExportMenu({ onExportPDF }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-accent transition-colors"
        title="Export conversation"
      >
        <FileDown className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Export</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 flex flex-col w-40 rounded-xl border border-border bg-card shadow-lg z-50 overflow-hidden">
            <button
              onClick={() => {
                onExportPDF();
                setOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-accent transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> Export as PDF
            </button>
            <button
              onClick={() => {
                setOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-accent transition-colors"
            >
            </button>
          </div>
        </>
      )}
    </div>
  );
}
