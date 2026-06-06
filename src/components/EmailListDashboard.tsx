import { useEffect, useState } from "react";
import { X, Mail, User, Phone, Check, XCircle, Loader2, Download, RefreshCcw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getEmailCaptures, getEmailStats, resendEmail } from "../lib/emailCapture";

interface EmailListDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
}

export default function EmailListDashboard({ isOpen, onClose, eventId }: EmailListDashboardProps) {
  const [emails, setEmails] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, sent: 0, pending: 0, failed: 0, withMarketing: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [retryingId, setRetryingId] = useState<number | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [emailData, statsData] = await Promise.all([
        getEmailCaptures(eventId),
        getEmailStats(eventId),
      ]);
      setEmails(emailData);
      setStats(statsData);
    } catch (error) {
      console.error("Error loading email data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, eventId]);

  const handleRetry = async (recordId: number) => {
    setRetryingId(recordId);
    try {
      await resendEmail(recordId);
      await loadData();
    } catch (error) {
      console.error("Error retrying email:", error);
    } finally {
      setRetryingId(null);
    }
  };

  const exportToCsv = () => {
    const headers = ["Email", "Prénom", "Nom", "Téléphone", "Marketing", "Envoyé", "Date"];
    const rows = emails.map((e) => [
      e.email,
      e.first_name || "",
      e.last_name || "",
      e.phone || "",
      e.consent_marketing ? "Oui" : "Non",
      e.email_sent ? "Oui" : "Non",
      new Date(e.created_at).toLocaleString("fr-FR"),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `emails-${eventId}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="relative flex h-[90vh] w-full max-w-3xl flex-col rounded-t-[2rem] bg-neuro-bg shadow-2xl sm:h-[80vh] sm:rounded-[2rem]"
            initial={{ y: "100%", scale: 0.95 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: "100%", scale: 0.95 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* Drag handle (mobile) */}
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="h-1 w-12 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 p-5 pb-4">
              <div>
                <h2 className="text-xl font-black text-white">Emails collectés</h2>
                <p className="mt-1 text-sm text-neuro-muted">{stats.total} contacts</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadData}
                  disabled={isLoading}
                  className="grid h-10 w-10 place-items-center rounded-full text-neuro-muted transition-all hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-50 touch-manipulation"
                  aria-label="Actualiser"
                >
                  <RefreshCcw className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={exportToCsv}
                  disabled={emails.length === 0}
                  className="grid h-10 w-10 place-items-center rounded-full text-neuro-muted transition-all hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-50 touch-manipulation"
                  aria-label="Exporter CSV"
                >
                  <Download className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="grid h-10 w-10 place-items-center rounded-full text-neuro-muted transition-all hover:bg-white/10 hover:text-white active:scale-95 touch-manipulation"
                  aria-label="Fermer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 gap-3 border-b border-white/10 p-5 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-neuro-muted">Envoyés</p>
                <p className="mt-1 text-2xl font-black text-emerald-300">{stats.sent}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-neuro-muted">En attente</p>
                <p className="mt-1 text-2xl font-black text-amber-300">{stats.pending}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-neuro-muted">Échoués</p>
                <p className="mt-1 text-2xl font-black text-red-300">{stats.failed}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-neuro-muted">Marketing</p>
                <p className="mt-1 text-2xl font-black text-indigo-300">{stats.withMarketing}</p>
              </div>
            </div>

            {/* Email list */}
            <div className="flex-1 overflow-y-auto p-5">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center gap-4 py-12">
                  <Loader2 className="h-10 w-10 animate-spin text-neuro-accent" />
                  <p className="text-sm text-neuro-muted">Chargement...</p>
                </div>
              ) : emails.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 py-12">
                  <Mail className="h-12 w-12 text-neuro-muted" />
                  <p className="text-sm text-neuro-muted">Aucun email collecté</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {emails.map((email) => (
                    <motion.div
                      key={email.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 transition-all hover:border-white/20 hover:bg-white/8"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 shrink-0 text-neuro-muted" />
                            <p className="truncate font-bold text-white">{email.email}</p>
                            {email.email_sent ? (
                              <Check className="h-4 w-4 shrink-0 text-emerald-300" />
                            ) : email.email_error ? (
                              <XCircle className="h-4 w-4 shrink-0 text-red-300" />
                            ) : null}
                          </div>
                          
                          {(email.first_name || email.last_name) && (
                            <div className="mt-2 flex items-center gap-2">
                              <User className="h-3.5 w-3.5 shrink-0 text-neuro-muted" />
                              <p className="text-sm text-neuro-muted">
                                {[email.first_name, email.last_name].filter(Boolean).join(" ")}
                              </p>
                            </div>
                          )}
                          
                          {email.phone && (
                            <div className="mt-1 flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5 shrink-0 text-neuro-muted" />
                              <p className="text-sm text-neuro-muted">{email.phone}</p>
                            </div>
                          )}
                          
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neuro-muted">
                            <span>{new Date(email.created_at).toLocaleString("fr-FR")}</span>
                            {email.consent_marketing && (
                              <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-indigo-300">
                                Marketing OK
                              </span>
                            )}
                          </div>
                        </div>

                        {email.email_error && (
                          <button
                            type="button"
                            onClick={() => handleRetry(email.id)}
                            disabled={retryingId === email.id}
                            className="flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1.5 text-xs font-bold text-red-300 transition-all hover:bg-red-500/30 active:scale-95 disabled:opacity-50 touch-manipulation"
                          >
                            {retryingId === email.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCcw className="h-3.5 w-3.5" />
                            )}
                            Renvoyer
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
