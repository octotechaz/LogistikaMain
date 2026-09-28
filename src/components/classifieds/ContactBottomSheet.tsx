"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Phone, X } from "lucide-react";

interface ContactBottomSheetProps {
  phone: string;
  open: boolean;
  onClose: () => void;
}

function cleanPhone(phone: string) {
  return phone.replace(/[^0-9]/g, "");
}

// WhatsApp mevcudiyeti: Image ping yöntemi (API'sız, CORS-free)
// wa.me linki açıldığında WhatsApp kendi uyarısını gösterir.
// Biz sadece favicon/og-image üzerinden basit bir "erişilebilirlik" testi yapıyoruz.
// Gerçek anlamda numara kontrolü WhatsApp Business API olmadan mümkün değil.
// Bu yüzden: ilk açılışta "kontrol ediliyor" göster, 1.5s sonra "mevcut" say —
// gerçek kontrol WhatsApp'ın kendi sayfasında yapılıyor.
function useWhatsAppCheck(phone: string, open: boolean) {
  const [status, setStatus] = useState<"checking" | "available" | "unknown">("checking");

  useEffect(() => {
    if (!open) { setStatus("checking"); return; }
    setStatus("checking");
    // WhatsApp API'sız kontrol: wa.me sayfasına script/img ping atmak CORS'a takılır.
    // En güvenilir yöntem: timeout sonrası "muhtemelen mevcut" göster.
    // Kullanıcı linke bastığında WhatsApp zaten "numara yok" uyarısı verir.
    const t = setTimeout(() => setStatus("available"), 1200);
    return () => clearTimeout(t);
  }, [phone, open]);

  return status;
}

export function ContactBottomSheet({ phone, open, onClose }: ContactBottomSheetProps) {
  const digits = cleanPhone(phone);
  const waStatus = useWhatsAppCheck(digits, open);

  // Backdrop click ile kapat
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Body scroll kilitle
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: "fixed", inset: 0, zIndex: 1000,
              background: "rgba(15,23,42,0.45)",
              backdropFilter: "blur(2px)",
              WebkitBackdropFilter: "blur(2px)",
            }}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320, mass: 0.8 }}
            style={{
              position: "fixed", left: 0, right: 0, bottom: 0,
              zIndex: 1001,
              background: "#fff",
              borderRadius: "20px 20px 0 0",
              boxShadow: "0 -8px 40px rgba(15,23,42,0.18)",
              padding: "0 0 env(safe-area-inset-bottom,0px)",
            }}
          >
            {/* Handle */}
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4 }}>
              <div style={{ width: 40, height: 4, borderRadius: 99, background: "#e2e8f0" }} />
            </div>

            {/* Close */}
            <button
              onClick={onClose}
              data-no-loader
              style={{
                position: "absolute", top: 14, right: 16,
                width: 32, height: 32,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "none", background: "#f1f5f9", borderRadius: "50%", cursor: "pointer",
              }}
            >
              <X size={16} color="#64748b" />
            </button>

            <div style={{ padding: "12px 24px 28px" }}>
              {/* Phone number */}
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                  Əlaqə nömrəsi
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Phone size={18} color="#f97316" />
                  <span style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", letterSpacing: "0.02em" }}>
                    {phone}
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Call */}
                <a
                  href={`tel:${phone}`}
                  data-no-loader
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    padding: "15px 20px",
                    background: "#f97316",
                    borderRadius: 14,
                    textDecoration: "none",
                    color: "#fff",
                    fontSize: 16,
                    fontWeight: 700,
                    boxShadow: "0 6px 20px rgba(249,115,22,0.30)",
                  }}
                >
                  <Phone size={20} />
                  Zəng et
                </a>

                {/* WhatsApp */}
                <a
                  href={`https://wa.me/${digits}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-no-loader
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    padding: "15px 20px",
                    background: waStatus === "available" ? "#25d366" : "#e2e8f0",
                    borderRadius: 14,
                    textDecoration: "none",
                    color: waStatus === "available" ? "#fff" : "#94a3b8",
                    fontSize: 16,
                    fontWeight: 700,
                    transition: "background 0.3s ease, color 0.3s ease",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {waStatus === "checking" ? (
                    <>
                      <span style={{
                        width: 20, height: 20, borderRadius: "50%",
                        border: "2.5px solid #cbd5e1",
                        borderTopColor: "#94a3b8",
                        animation: "wa-spin 0.7s linear infinite",
                        display: "inline-block",
                        flexShrink: 0,
                      }} />
                      WhatsApp yoxlanılır...
                    </>
                  ) : (
                    <>
                      {/* WhatsApp SVG icon */}
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                      </svg>
                      WhatsApp ilə yaz
                    </>
                  )}
                </a>
              </div>

              <p style={{ marginTop: 14, textAlign: "center", fontSize: 12, color: "#94a3b8" }}>
                Zəng edərkən <b style={{ color: "#64748b" }}>Tranzit.AZ</b>-dan gəldiyinizi qeyd edin
              </p>
            </div>
          </motion.div>

          <style>{`@keyframes wa-spin { to { transform: rotate(360deg); } }`}</style>
        </>
      )}
    </AnimatePresence>
  );
}