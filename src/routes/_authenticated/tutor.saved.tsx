import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GilaniLoader } from "@/components/GilaniLoader";
import { Star, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { TutorPageHeader } from "@/components/tutor/TutorPageHeader";
import { MarkdownRenderer } from "@/components/tutor/MarkdownRenderer";

export const Route = createFileRoute("/_authenticated/tutor/saved")({
  component: SavedRoute,
});

function SavedRoute() {
  const [savedMessages, setSavedMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchSaved = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: feedbackData, error: feedbackError } = await supabase
          .from("message_feedback")
          .select("message_id")
          .eq("user_id", user.id)
          .eq("vote", 1);

        if (feedbackError) throw feedbackError;

        const messageIds = (feedbackData || []).map((f: any) => f.message_id);
        if (messageIds.length === 0) {
          if (mounted) setSavedMessages([]);
          return;
        }

        const { data: messagesData, error: messagesError } = await supabase
          .from("messages")
          .select("id, content, created_at, conversation_id, conversations(title)")
          .in("id", messageIds)
          .order("created_at", { ascending: false });

        if (messagesError) throw messagesError;
        if (mounted) setSavedMessages(messagesData || []);
      } catch (err: any) {
        toast.error(err.message || "Failed to load saved items");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchSaved();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading)
    return (
      <div className="h-full flex flex-col">
        <TutorPageHeader title="Saved Explanations" subtitle="Your bookmarked AI responses" />
        <div className="flex-1 flex items-center justify-center">
          <GilaniLoader />
        </div>
      </div>
    );

  return (
    <div className="h-full flex flex-col bg-background">
      <TutorPageHeader
        title="Saved Explanations"
        subtitle={`${savedMessages.length} saved response${savedMessages.length !== 1 ? "s" : ""}`}
      />
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="max-w-5xl mx-auto">
          {savedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-border rounded-2xl bg-muted/20 mt-8">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Star className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">No saved items yet</h3>
              <p className="text-muted-foreground max-w-sm">
                Click the <span className="text-primary font-medium">thumbs up</span> icon on any AI
                response in your chats to save it here for quick review.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {savedMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="p-6 border border-border bg-card rounded-2xl shadow-sm flex flex-col overflow-hidden hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 shrink-0" />
                    <span className="truncate">
                      From: {(msg.conversations as any)?.title || "Unknown Chat"}
                    </span>
                  </div>
                  <div className="text-sm text-foreground flex-1 overflow-y-auto pr-1 markdown-content max-h-[280px]">
                    <MarkdownRenderer content={msg.content || ""} />
                  </div>
                  <div className="mt-4 pt-4 border-t border-border/50 flex justify-between items-center flex-shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.created_at).toLocaleDateString()}
                    </span>
                    <a
                      href={`/tutor/${msg.conversation_id}`}
                      className="text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5 text-sm font-medium"
                    >
                      <MessageSquare className="h-4 w-4" />
                      View Chat
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
