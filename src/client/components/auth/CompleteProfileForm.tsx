import { type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Logo } from "@/client/components/ui/logo";
import { ArrowRight, Loader2 } from "lucide-react";

const profileSchema = z.object({
  displayName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters")
    .regex(/^[a-zA-Z\s\-']+$/, "Name contains invalid characters"),
  role: z.enum(["student", "teacher"]),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface CompleteProfileFormProps {
  initialName?: string;
  missingName?: boolean;
  missingRole?: boolean;
  onSave: (displayName: string, role: "student" | "teacher") => Promise<void>;
}

export function CompleteProfileForm({
  initialName = "",
  missingName = true,
  missingRole = true,
  onSave,
}: CompleteProfileFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: initialName || "",
      role: "student",
    },
    mode: "onChange",
  });

  const onSubmitForm = async (data: ProfileFormValues) => {
    try {
      await onSave(data.displayName, data.role);
    } catch {
      // Error is caught and toast shown by parent component (AuthModal / callback)
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="relative w-full max-w-[420px] animate-in fade-in zoom-in-95 duration-300">
        {/* Outer glow */}
        <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-[#C96A3D]/20 via-transparent to-transparent blur-sm pointer-events-none" />

        <div className="relative rounded-3xl border border-white/[0.08] bg-[#13151f]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* Top accent bar */}
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#C96A3D] to-transparent opacity-70" />

          <div className="p-7 sm:p-9 space-y-6">
            {/* Header */}
            <div className="text-center space-y-2 pt-1">
              <Logo to="/" size="md" className="mx-auto" />
              <div className="space-y-1 pt-1">
                <h1 className="font-serif text-2xl font-black text-white tracking-tight">
                  Complete your profile
                </h1>
                <p className="text-sm text-white/40">Almost done.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-5">
              {/* Display Name */}
              {missingName && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-baseline">
                    <label className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
                      What should we call you?
                    </label>
                    {errors.displayName && (
                      <span className="text-[10px] text-red-400">{errors.displayName.message}</span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Your full name"
                      {...register("displayName")}
                      className={`w-full rounded-2xl border bg-white/[0.04] px-4 py-3.5 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-1 transition-all ${
                        errors.displayName
                          ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/30"
                          : "border-white/[0.08] focus:border-[#C96A3D]/50 focus:ring-[#C96A3D]/30 focus:bg-white/[0.06]"
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Role Selector */}
              {missingRole && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-baseline">
                    <label className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
                      I am a
                    </label>
                    {errors.role && (
                      <span className="text-[10px] text-red-400">{errors.role.message}</span>
                    )}
                  </div>
                  <div className="relative">
                    <select
                      {...register("role")}
                      className={`w-full appearance-none rounded-2xl border bg-white/[0.04] px-4 py-3.5 text-sm text-white focus:outline-none focus:ring-1 transition-all cursor-pointer ${
                        errors.role
                          ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/30"
                          : "border-white/[0.08] focus:border-[#C96A3D]/50 focus:ring-[#C96A3D]/30 focus:bg-white/[0.06]"
                      }`}
                    >
                      <option value="student" className="bg-[#13151f] text-white">
                        Student
                      </option>
                      <option value="teacher" className="bg-[#13151f] text-white">
                        Teacher
                      </option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                      <svg
                        className="h-4 w-4 text-white/40"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || (missingName && !isValid)}
                className="group w-full flex items-center justify-center gap-2 rounded-2xl bg-[#C96A3D] py-3.5 text-sm font-bold text-white hover:bg-[#D9784A] active:scale-[0.98] disabled:opacity-50 transition-all duration-200 shadow-lg shadow-[#C96A3D]/20 cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
