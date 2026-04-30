import { supabase } from "./supabase";

type SendEmailPayload = {
  to: string;
  subject: string;
  html: string;
};

export const sendEmail = async ({ to, subject, html }: SendEmailPayload) => {
  try {
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: {
        to,
        subject,
        html,
      },
    });

    if (error) {
      console.error("Erreur Edge Function send-email:", error);

      return {
        success: false,
        error,
        message:
          error.message ||
          "Email non envoyé. Vérifie la Edge Function send-email.",
      };
    }

    if (data?.error) {
      console.error("Erreur Resend:", data.error);

      return {
        success: false,
        error: data.error,
        message:
          data.error?.message ||
          data.error ||
          "Email refusé par Resend. Vérifie le domaine ou la clé API.",
      };
    }

    return {
      success: true,
      data,
      message: "Email envoyé avec succès.",
    };
  } catch (err) {
    console.error("Erreur envoi email:", err);

    return {
      success: false,
      error: err,
      message: "Erreur inattendue pendant l’envoi de l’email.",
    };
  }
};