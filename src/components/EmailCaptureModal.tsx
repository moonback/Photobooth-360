import { useState } from "react";
import { X, Mail, User, Phone, Send, Loader2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface EmailCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EmailCaptureData) => Promise<void>;
  videoUrl: string;
}

export interface EmailCaptureData {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  consentMarketing: boolean;
}

export default function EmailCaptureModal({ isOpen, onClose, onSubmit, videoUrl }: EmailCaptureModalProps) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      setError("Veuillez entrer un email valide");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await onSubmit({
        email,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
        consentMarketing,
      });

      setIsSuccess(true);
      
      // Fermer après 2 secondes
      setTimeout(() => {
        onClose();
        // Reset form
        setEmail("");
        setFirstName("");
        setLastName("");
        setPhone("");
        setConsentMarketing(false);
        setIsSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setError("");
    }
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
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-md rounded-t-[2rem] bg-neuro-bg shadow-2xl sm:rounded-[2rem]"
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
                <h2 className="text-xl font-black text-white">Recevoir ma vidéo</h2>
                <p className="mt-1 text-sm text-neuro-muted">Nous vous l'enverrons par email</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="grid h-10 w-10 place-items-center rounded-full text-neuro-muted transition-all hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-50 touch-manipulation"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Success state */}
            {isSuccess && (
              <motion.div
                className="flex flex-col items-center gap-4 p-8"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <motion.div
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20"
                  animate={{
                    scale: [1, 1.1, 1],
                    boxShadow: [
                      "0 0 20px rgba(16, 185, 129, 0.3)",
                      "0 0 40px rgba(16, 185, 129, 0.5)",
                      "0 0 20px rgba(16, 185, 129, 0.3)",
                    ],
                  }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <CheckCircle2 className="h-10 w-10 text-emerald-300" />
                </motion.div>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-white">Email envoyé !</h3>
                  <p className="mt-1 text-sm text-neuro-muted">Vérifiez votre boîte de réception</p>
                </div>
              </motion.div>
            )}

            {/* Form */}
            {!isSuccess && (
              <form onSubmit={handleSubmit} className="p-5">
                <div className="space-y-4">
                  {/* Email (requis) */}
                  <div>
                    <label htmlFor="email" className="mb-2 block text-sm font-bold text-white">
                      Email <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neuro-muted" />
                      <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="votre@email.com"
                        className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-12 pr-4 text-white placeholder-neuro-muted transition-all focus:border-neuro-accent focus:bg-white/8 focus:outline-none focus:ring-2 focus:ring-neuro-accent/20 touch-manipulation"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  {/* Prénom */}
                  <div>
                    <label htmlFor="firstName" className="mb-2 block text-sm font-bold text-white">
                      Prénom
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neuro-muted" />
                      <input
                        type="text"
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Jean"
                        className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-12 pr-4 text-white placeholder-neuro-muted transition-all focus:border-neuro-accent focus:bg-white/8 focus:outline-none focus:ring-2 focus:ring-neuro-accent/20 touch-manipulation"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  {/* Nom */}
                  <div>
                    <label htmlFor="lastName" className="mb-2 block text-sm font-bold text-white">
                      Nom
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neuro-muted" />
                      <input
                        type="text"
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Dupont"
                        className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-12 pr-4 text-white placeholder-neuro-muted transition-all focus:border-neuro-accent focus:bg-white/8 focus:outline-none focus:ring-2 focus:ring-neuro-accent/20 touch-manipulation"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  {/* Téléphone */}
                  <div>
                    <label htmlFor="phone" className="mb-2 block text-sm font-bold text-white">
                      Téléphone
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neuro-muted" />
                      <input
                        type="tel"
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+33 6 12 34 56 78"
                        className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-12 pr-4 text-white placeholder-neuro-muted transition-all focus:border-neuro-accent focus:bg-white/8 focus:outline-none focus:ring-2 focus:ring-neuro-accent/20 touch-manipulation"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  {/* Consentement marketing */}
                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition-all hover:border-white/20 hover:bg-white/8 touch-manipulation">
                    <input
                      type="checkbox"
                      checked={consentMarketing}
                      onChange={(e) => setConsentMarketing(e.target.checked)}
                      disabled={isSubmitting}
                      className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-white/20 bg-white/10 text-neuro-accent transition-all focus:ring-2 focus:ring-neuro-accent/20 focus:ring-offset-0"
                    />
                    <span className="text-sm text-neuro-muted">
                      J'accepte de recevoir des communications marketing de l'organisateur
                    </span>
                  </label>

                  {/* Error message */}
                  {error && (
                    <motion.div
                      className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {error}
                    </motion.div>
                  )}
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !email}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 py-4 text-base font-bold text-white shadow-lg transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      Recevoir ma vidéo
                    </>
                  )}
                </button>

                <p className="mt-4 text-center text-xs text-neuro-muted">
                  Vos données sont protégées et ne seront pas partagées
                </p>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
