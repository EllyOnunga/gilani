import { Check, X } from "lucide-react";

export function PasswordRequirements({ password }: { password: string }) {
  if (!password) return null;

  const reqs = [
    { label: "At least 8 characters long", met: password.length >= 8 },
    { label: "Contains a number (0-9)", met: /\d/.test(password) },
    { label: "Contains a letter (a-z / A-Z)", met: /[a-zA-Z]/.test(password) },
  ];

  return (
    <div className="rounded-xl border border-white/8 bg-[#12151e] p-3 space-y-1.5 transition-all">
      <p className="font-mono text-[9px] uppercase tracking-widest text-[#6b7280] font-bold mb-1">
        Password Requirements:
      </p>
      {reqs.map((req, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          {req.met ? (
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 shrink-0">
              <Check className="h-2.5 w-2.5" />
            </div>
          ) : (
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white/5 text-[#6b7280] shrink-0">
              <X className="h-2.5 w-2.5" />
            </div>
          )}
          <span className={req.met ? "text-emerald-400 font-medium" : "text-[#6b7280]"}>
            {req.label}
          </span>
        </div>
      ))}
    </div>
  );
}
