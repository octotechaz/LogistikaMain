import { Router } from "express";
import { waService } from "../whatsapp";
import { otpService, normalizeInternationalPhone } from "../services/OtpService";

const router = Router();
const OTP_RE = /^\d{6}$/;

function isMalformedInput(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return msg.includes("malformed") || msg.includes("invalid otp");
}

router.get("/whatsapp/status", (req, res) => {
    res.json(waService.getStatus());
});

router.post("/whatsapp/logout", async (req, res) => {
    try {
        await waService.logout();
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post("/whatsapp/send-code", async (req, res) => {
    try {
        const rawPhone = typeof req.body.phone === "string" ? req.body.phone : "";
        const code = typeof req.body.code === "string" ? req.body.code : "";

        if (!rawPhone || !code) {
            res.status(400).json({ error: "Telefon və kod mütləqdir" });
            return;
        }

        if (!OTP_RE.test(code)) {
            res.status(400).json({ error: "Kod 6 rəqəmli olmalıdır" });
            return;
        }

        // Validate phone format before attempting send (throws on malformed)
        try {
            normalizeInternationalPhone(rawPhone);
        } catch {
            res.status(400).json({ error: "Telefon nömrəsi düzgün deyil" });
            return;
        }

        const purpose = req.body.purpose === "password_reset" ? "password_reset" : "registration";
        const message =
            purpose === "password_reset"
                ? `Tranzit.az şifrə sıfırlama kodunuz: *${code}*\n\nBu kodu heç kimlə paylaşmayın.`
                : `Tranzit.az doğrulama kodunuz: *${code}*\n\nBu kodu heç kimlə paylaşmayın.`;

        await waService.sendMessage(rawPhone, message);

        // Store only after successful WhatsApp delivery
        otpService.store(rawPhone, code);

        res.json({ success: true });
    } catch (e: any) {
        if (isMalformedInput(e)) {
            res.status(400).json({ success: false, error: e.message });
            return;
        }
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post("/whatsapp/verify-otp", (req, res) => {
    const rawPhone = typeof req.body.phone === "string" ? req.body.phone : "";
    const otp = typeof req.body.otp === "string" ? req.body.otp : "";

    if (!rawPhone || !otp) {
        res.status(400).json({ success: false, message: "Telefon və OTP mütləqdir" });
        return;
    }

    if (!OTP_RE.test(otp)) {
        res.status(400).json({ success: false, message: "OTP 6 rəqəmli olmalıdır" });
        return;
    }

    try {
        normalizeInternationalPhone(rawPhone);
    } catch {
        res.status(400).json({ success: false, message: "Telefon nömrəsi düzgün deyil" });
        return;
    }

    let result: ReturnType<typeof otpService.verify>;
    try {
        result = otpService.verify(rawPhone, otp);
    } catch (e: any) {
        if (isMalformedInput(e)) {
            res.status(400).json({ success: false, message: e.message });
            return;
        }
        res.status(500).json({ success: false, message: "Server xətası" });
        return;
    }

    if (result === "ok") {
        res.json({ success: true });
        return;
    }

    if (result === "expired") {
        res.status(400).json({ success: false, message: "OTP kodunun vaxtı bitib." });
        return;
    }

    res.status(400).json({ success: false, message: "OTP kodu yanlışdır." });
});

router.post("/whatsapp/send-message", async (req, res) => {
    try {
        const message = typeof req.body.message === "string" ? req.body.message : "";
        const phones = Array.isArray(req.body.phones)
            ? req.body.phones.filter((phone: unknown) => typeof phone === "string" && phone.trim() !== "")
            : typeof req.body.phone === "string" && req.body.phone.trim() !== ""
              ? [req.body.phone]
              : [];

        if (phones.length === 0 || !message) {
            res.status(400).json({ error: "Telefon(lar) və mesaj mütləqdir" });
            return;
        }

        const result = await waService.sendMessageToMany(phones, message);
        res.json({ success: true, sent: result.sent, failed: result.failed });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

export { router as whatsappRoutes };
