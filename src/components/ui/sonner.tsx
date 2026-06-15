import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-md group-[.toaster]:text-center group-[.toaster]:text-xs group-[.toaster]:font-medium group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-center group-[.toast]:text-[11px]",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          error: "group-[.toaster]:bg-destructive/10 group-[.toaster]:text-destructive group-[.toaster]:border-destructive/20",
          success: "group-[.toaster]:bg-green-500/10 group-[.toaster]:text-green-700 dark:group-[.toaster]:text-green-400 group-[.toaster]:border-green-500/20",
          warning: "group-[.toaster]:bg-amber-500/10 group-[.toaster]:text-amber-700 dark:group-[.toaster]:text-amber-400 group-[.toaster]:border-amber-500/20",
          info: "group-[.toaster]:bg-primary/10 group-[.toaster]:text-primary group-[.toaster]:border-primary/20",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
