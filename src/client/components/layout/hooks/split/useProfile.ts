import { useEffect, useState } from "react";
import { supabase } from "@/client/supabase";

export function useProfile(userId: string | null | undefined) {
  const [currentPlan, setCurrentPlan] = useState("free");
  const [profileName, setProfileName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("plan, display_name, avatar_url")
        .eq("id", userId)
        .maybeSingle();
      if (!error && data) {
        if (data.plan) setCurrentPlan(data.plan);
        setProfileName(data.display_name || "");
        setAvatarUrl(data.avatar_url || null);
      }
    } catch (err) {
      console.error("Failed to load profile for sidebar:", err);
    }
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleProfileUpdate = () => fetchProfile();
    window.addEventListener("custom:profile-updated", handleProfileUpdate);
    return () => window.removeEventListener("custom:profile-updated", handleProfileUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return { profileName, avatarUrl, currentPlan };
}
