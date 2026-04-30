import { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export type UserSettings = {
  id?: string;
  user_id: string;
  company_name: string | null;
  company_email: string | null;
  company_phone: string | null;
  company_website: string | null;
  company_address?: string | null;
  logo_url?: string | null;
  main_color?: string | null;
  advisor_name: string | null;
  advisor_role: string | null;
  advisor_photo_url?: string | null;
  whatsapp_url: string | null;
  booking_url: string | null;
  welcome_subject: string | null;
  welcome_content: string | null;
  completed: boolean | null;
};

export function useUserSettings(session: Session | null) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const fetchSettings = async () => {
    if (!session) {
      setSettings(null);
      setLoadingSettings(false);
      return;
    }

    setLoadingSettings(true);

    const { data, error } = await supabase
      .from("user_onboarding")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error) {
      console.error("Erreur user settings:", error.message);
      setSettings(null);
    } else {
      setSettings(data as UserSettings);
    }

    setLoadingSettings(false);
  };

  useEffect(() => {
    fetchSettings();
  }, [session?.user.id]);

  return {
    settings,
    loadingSettings,
    refetchSettings: fetchSettings,
  };
}
