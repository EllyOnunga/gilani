// components/DisclaimerModal.tsx
import { useState, useEffect } from "react";
import { AlertTriangle, BookOpen, Shield, Heart } from "lucide-react";

export function DisclaimerModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeenDisclaimer = localStorage.getItem("gilani_disclaimer_accepted");
    if (!hasSeenDisclaimer) {
      setIsOpen(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("gilani_disclaimer_accepted", "true");
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8 animate-in-slide">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-serif font-bold">Welcome to GilaniAI</h2>
        </div>

        <div className="space-y-4 text-sm text-muted-foreground">
          <p>
            GilaniAI is an AI-powered study assistant for Kenyan and international students. Before
            you begin, please understand:
          </p>

          <div className="space-y-3">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">AI Limitations</p>
                <p className="text-xs">
                  I can make mistakes. Always verify important information with your teacher,
                  official textbooks, or curriculum bodies like KNEC and KICD.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Shield className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Not a Replacement</p>
                <p className="text-xs">
                  I supplement, but do not replace, professional teachers, medical professionals,
                  legal advisors, or mental health counselors.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Heart className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Safety First</p>
                <p className="text-xs">
                  For emergencies: Kenya Red Cross (1199), Childline Kenya (116), Befrienders Kenya
                  (0800 723 253). Your safety matters.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-xs">
            <p className="font-medium mb-1">By using GilaniAI, you acknowledge that:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>AI responses may contain errors or outdated information</li>
              <li>This tool is for educational support, not professional advice</li>
              <li>You should verify critical information independently</li>
              <li>You will use this tool responsibly and ethically</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleAccept}
            className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            I Understand — Let's Learn!
          </button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-3">
          You can review this disclaimer anytime in Settings
        </p>
      </div>
    </div>
  );
}
