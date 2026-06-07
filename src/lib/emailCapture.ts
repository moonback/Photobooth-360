import { getSupabaseClient } from "./supabase";
import type { EmailCaptureData } from "../components/EmailCaptureModal";

interface SaveEmailCaptureParams {
  eventId: string;
  videoId: string;
  videoUrl: string;
  emailData: EmailCaptureData;
  sendEmail?: boolean;
}

interface EmailCaptureRecord {
  id: number;
  event_id: string;
  video_id: string;
  video_url: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  consent_marketing: boolean;
  email_sent: boolean;
  email_sent_at: string | null;
  email_error: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Sauvegarde une collecte d'email dans Supabase
 */
export async function saveEmailCapture({
  eventId,
  videoId,
  videoUrl,
  emailData,
  sendEmail = true,
}: SaveEmailCaptureParams): Promise<EmailCaptureRecord> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("email_captures")
    .insert({
      event_id: eventId,
      video_id: videoId,
      video_url: videoUrl,
      email: emailData.email,
      first_name: emailData.firstName || null,
      last_name: emailData.lastName || null,
      phone: emailData.phone || null,
      consent_marketing: emailData.consentMarketing,
      metadata: {
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      },
    })
    .select()
    .single();

  if (error) {
    console.error("Error saving email capture:", error);
    throw new Error("Impossible de sauvegarder l'email");
  }

  // Appeler la fonction d'envoi d'email seulement si activé
  if (sendEmail) {
    try {
      await sendVideoEmail({
        email: emailData.email,
        firstName: emailData.firstName,
        videoUrl,
        recordId: data.id,
      });
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      // Ne pas bloquer — l'email est sauvegardé, renvoi possible depuis le dashboard
    }
  }

  return data;
}

interface SendVideoEmailParams {
  email: string;
  firstName?: string;
  videoUrl: string;
  recordId: number;
}

/**
 * Envoie l'email avec la vidéo via Supabase Edge Function + Resend
 */
async function sendVideoEmail({
  email,
  firstName,
  videoUrl,
  recordId,
}: SendVideoEmailParams): Promise<void> {
  const client = getSupabaseClient();
  const { data, error } = await client.functions.invoke("send-video-email", {
    body: { email, firstName, videoUrl, recordId },
  });

  // error = erreur réseau / fonction introuvable (non-2xx sans body JSON)
  if (error) {
    const msg = error.message ?? "Edge Function inaccessible";
    console.error("Edge Function invoke error:", msg, error);
    await client.from("email_captures").update({ email_error: msg }).eq("id", recordId);
    throw new Error(msg);
  }

  // La fonction retourne toujours 200, success:false = erreur métier (ex: clé Resend manquante)
  if (data && !data.success) {
    const msg = data.error ?? "Erreur inconnue dans la Edge Function";
    console.error("Edge Function business error:", msg);
    await client.from("email_captures").update({ email_error: msg }).eq("id", recordId);
    throw new Error(msg);
  }

  console.log("✅ Email envoyé via Resend, id:", data?.id);
}

/**
 * Récupère toutes les captures d'email pour un événement
 */
export async function getEmailCaptures(eventId: string = "default"): Promise<EmailCaptureRecord[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("email_captures")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching email captures:", error);
    throw new Error("Impossible de récupérer les emails");
  }

  return data || [];
}

/**
 * Récupère les statistiques d'email pour un événement
 */
export async function getEmailStats(eventId: string = "default") {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("email_captures")
    .select("*")
    .eq("event_id", eventId);

  if (error) {
    console.error("Error fetching email stats:", error);
    return {
      total: 0,
      sent: 0,
      pending: 0,
      failed: 0,
      withMarketing: 0,
    };
  }

  const emails = data || [];

  return {
    total: emails.length,
    sent: emails.filter((e) => e.email_sent).length,
    pending: emails.filter((e) => !e.email_sent && !e.email_error).length,
    failed: emails.filter((e) => e.email_error).length,
    withMarketing: emails.filter((e) => e.consent_marketing).length,
  };
}

/**
 * Renvoie un email qui a échoué
 */
export async function resendEmail(recordId: number): Promise<void> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("email_captures")
    .select("*")
    .eq("id", recordId)
    .single();

  if (error || !data) {
    throw new Error("Email capture introuvable");
  }

  await sendVideoEmail({
    email: data.email,
    firstName: data.first_name || undefined,
    videoUrl: data.video_url,
    recordId: data.id,
  });
}

/**
 * Clear all email captures for a given eventId
 */
export async function clearEmailCaptures(eventId: string = "default"): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[clearEmailCaptures] Clearing email captures for eventId:', eventId);
    const client = getSupabaseClient();
    const { error, count } = await client
      .from("email_captures")
      .delete({ count: 'exact' })
      .eq("event_id", eventId);

    if (error) {
      console.error('[clearEmailCaptures] Error:', error);
      return { success: false, error: error.message };
    }
    console.log('[clearEmailCaptures] Successfully cleared', count, 'email captures!');
    return { success: true };
  } catch (err) {
    console.error('[clearEmailCaptures] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue" };
  }
}
