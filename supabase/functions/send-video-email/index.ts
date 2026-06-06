import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "noreply@yourdomain.com";
const FROM_NAME = Deno.env.get("FROM_NAME") ?? "Photobooth 360";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Log de démarrage pour diagnostiquer les secrets manquants
console.log("🚀 send-video-email démarrage", {
  hasResendKey: Boolean(RESEND_API_KEY),
  hasSupabaseUrl: Boolean(SUPABASE_URL),
  hasServiceRoleKey: Boolean(SUPABASE_SERVICE_ROLE_KEY),
  fromEmail: FROM_EMAIL,
  fromName: FROM_NAME,
});

serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Route de health check
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({
        status: "ok",
        hasResendKey: Boolean(RESEND_API_KEY),
        hasSupabaseUrl: Boolean(SUPABASE_URL),
        hasServiceRoleKey: Boolean(SUPABASE_SERVICE_ROLE_KEY),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }

  let recordId: number | null = null;

  try {
    const body = await req.json();
    const { email, firstName, videoUrl, recordId: rid } = body as {
      email: string;
      firstName?: string;
      videoUrl: string;
      recordId: number;
    };

    recordId = rid;

    console.log("📧 Traitement email pour:", email, "recordId:", recordId);

    if (!email || !videoUrl) {
      throw new Error("Paramètres manquants: email et videoUrl sont requis");
    }

    if (!RESEND_API_KEY) {
      throw new Error(
        "RESEND_API_KEY non configurée. Allez dans Supabase Dashboard → Edge Functions → Secrets et ajoutez RESEND_API_KEY."
      );
    }

    const displayName = firstName || "là";
    const html = buildEmailHtml({ displayName, videoUrl, fromName: FROM_NAME });

    // Appel API Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [email],
        subject: `🎥 Votre vidéo est prête — ${FROM_NAME}`,
        html,
      }),
    });

    const resendBody = await resendResponse.json();

    if (!resendResponse.ok) {
      throw new Error(
        `Resend error ${resendResponse.status}: ${JSON.stringify(resendBody)}`
      );
    }

    console.log("✅ Email envoyé via Resend, id:", resendBody.id);

    // Mettre à jour le statut en base avec le service role (bypass RLS)
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && recordId) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { error: dbError } = await supabase
        .from("email_captures")
        .update({
          email_sent: true,
          email_sent_at: new Date().toISOString(),
          email_error: null,
          metadata: { resend_id: resendBody.id },
        })
        .eq("id", recordId);

      if (dbError) console.error("DB update error:", dbError.message);
    }

    return new Response(
      JSON.stringify({ success: true, id: resendBody.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("❌ send-video-email error:", message);

    // Enregistrer l'erreur en base si on a l'ID
    if (recordId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase
          .from("email_captures")
          .update({ email_error: message })
          .eq("id", recordId);
      } catch (_) {
        // silent
      }
    }

    // Retourner 200 avec success:false pour que le client puisse lire le message
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});

// ─── Template HTML ────────────────────────────────────────────────────────────

function buildEmailHtml({
  displayName,
  videoUrl,
  fromName,
}: {
  displayName: string;
  videoUrl: string;
  fromName: string;
}): string {
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Votre vidéo est prête</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#09090B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#09090B;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Card principale -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;border-radius:24px;background:linear-gradient(145deg,#18181B,#111113);border:1px solid rgba(255,255,255,0.08);overflow:hidden;">

          <!-- Header gradient -->
          <tr>
            <td style="padding:0;background:linear-gradient(135deg,#4F46E5 0%,#7C3AED 50%,#EC4899 100%);height:6px;"></td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 36px 32px;">

              <!-- Logo / titre -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <div style="display:inline-block;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);border-radius:16px;padding:12px 20px;">
                      <span style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.03em;">📸 ${fromName}</span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Salutation -->
              <p style="margin:0 0 8px;font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.04em;line-height:1.2;">
                Bonjour ${displayName} 👋
              </p>
              <p style="margin:0 0 32px;font-size:16px;color:rgba(255,255,255,0.55);line-height:1.6;">
                Votre vidéo 360° est prête. Téléchargez-la avant qu'elle expire&nbsp;!
              </p>

              <!-- Bouton CTA principal -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="${videoUrl}"
                       style="display:inline-block;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:#ffffff;font-size:16px;font-weight:800;text-decoration:none;padding:16px 40px;border-radius:14px;letter-spacing:-0.01em;box-shadow:0 8px 32px rgba(99,102,241,0.4);">
                      🎬 Télécharger ma vidéo
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Lien texte alternatif -->
              <p style="margin:0 0 32px;font-size:13px;color:rgba(255,255,255,0.35);text-align:center;">
                Ou copiez ce lien&nbsp;:<br/>
                <a href="${videoUrl}" style="color:rgba(99,102,241,0.8);word-break:break-all;font-size:12px;">${videoUrl}</a>
              </p>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:0 0 28px;" />

              <!-- Info box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.4);letter-spacing:0.12em;text-transform:uppercase;">Infos utiles</p>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
                          <span style="font-size:14px;color:rgba(255,255,255,0.5);">📱</span>
                          <span style="font-size:14px;color:rgba(255,255,255,0.7);margin-left:10px;">Compatible iOS, Android et desktop</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;">
                          <span style="font-size:14px;color:rgba(255,255,255,0.5);">⏳</span>
                          <span style="font-size:14px;color:rgba(255,255,255,0.7);margin-left:10px;">Lien valide 30 jours</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px 28px;background:rgba(0,0,0,0.25);border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.25);text-align:center;line-height:1.6;">
                Cet email vous a été envoyé car vous avez utilisé ${fromName}.<br/>
                © ${year} ${fromName} — Tous droits réservés
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}
