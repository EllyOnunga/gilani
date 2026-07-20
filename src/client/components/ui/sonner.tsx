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
            "group-[.toaster]:!bg-transparent",
            "group-[.toaster]:text-[#e2e4f0]",
            "group-[.toaster]:!border-none",
            "group-[.toaster]:!shadow-none",
            "group-[.toaster]:text-xs group-[.toaster]:font-medium",
            "group-[.toaster]:text-center group-[.toaster]:justify-center",
          ].join(" "),
          title: "group-[.toast]:text-center group-[.toast]:w-full",
          description: [
            "group-[.toast]:text-[#9ca3af]",
            "group-[.toast]:text-[11px]",
            "group-[.toast]:text-center",
          ].join(" "),
          // ── Success ─────────────────────────────
          success:
            "group-[.toaster]:!bg-transparent group-[.toaster]:!text-[#6ee7a0] group-[.toaster]:!border-none",
          // ── Error ───────────────────────────────
          error:
            "group-[.toaster]:!bg-transparent group-[.toaster]:!text-[#fca5a5] group-[.toaster]:!border-none",
          // ── Warning ─────────────────────────────
          warning:
            "group-[.toaster]:!bg-transparent group-[.toaster]:!text-[#fcd34d] group-[.toaster]:!border-none",
          // ── Info ────────────────────────────────
          info: "group-[.toaster]:!bg-transparent group-[.toaster]:!text-[#93c5fd] group-[.toaster]:!border-none",
          actionButton:
            "group-[.toast]:!bg-transparent group-[.toast]:text-white group-[.toast]:underline",
          cancelButton:
            "group-[.toast]:!bg-transparent group-[.toast]:text-[#9ca3af] group-[.toast]:underline",
          closeButton:
            "group-[.toast]:!bg-transparent group-[.toast]:!border-none group-[.toast]:text-[#9ca3af]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
