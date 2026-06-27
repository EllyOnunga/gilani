import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: [
            "group toast",
            "group-[.toaster]:bg-[#1a1d27]",
            "group-[.toaster]:text-[#e2e4f0]",
            "group-[.toaster]:border group-[.toaster]:border-white/10",
            "group-[.toaster]:shadow-xl group-[.toaster]:shadow-black/40",
            "group-[.toaster]:rounded-xl",
            "group-[.toaster]:text-xs group-[.toaster]:font-medium",
            "group-[.toaster]:backdrop-blur-md",
          ].join(" "),
          description: ["group-[.toast]:text-[#9ca3af]", "group-[.toast]:text-[11px]"].join(" "),
          // ── Success ─────────────────────────────
          success: [
            "group-[.toaster]:!bg-[#0f2818]",
            "group-[.toaster]:!text-[#6ee7a0]",
            "group-[.toaster]:!border-[#166534]/50",
          ].join(" "),
          // ── Error ───────────────────────────────
          error: [
            "group-[.toaster]:!bg-[#2a0f0f]",
            "group-[.toaster]:!text-[#fca5a5]",
            "group-[.toaster]:!border-[#7f1d1d]/50",
          ].join(" "),
          // ── Warning ─────────────────────────────
          warning: [
            "group-[.toaster]:!bg-[#271c04]",
            "group-[.toaster]:!text-[#fcd34d]",
            "group-[.toaster]:!border-[#78350f]/50",
          ].join(" "),
          // ── Info ────────────────────────────────
          info: [
            "group-[.toaster]:!bg-[#0c1a2e]",
            "group-[.toaster]:!text-[#93c5fd]",
            "group-[.toaster]:!border-[#1e3a5f]/50",
          ].join(" "),
          actionButton:
            "group-[.toast]:bg-white/10 group-[.toast]:text-white group-[.toast]:hover:bg-white/20",
          cancelButton:
            "group-[.toast]:bg-white/5 group-[.toast]:text-[#9ca3af] group-[.toast]:hover:bg-white/10",
          closeButton:
            "group-[.toast]:border-white/10 group-[.toast]:bg-[#1a1d27] group-[.toast]:text-[#9ca3af]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
