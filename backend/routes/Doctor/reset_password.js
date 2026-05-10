const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const Doc = require("../../models/Doc");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const { transporter } = require("../../utils/mailer");
const {
  store,
  hashOtp,
  generateOtp,
  OTP_TTL_MS,
} = require("../../utils/otpUtils");

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, error: "Too many password reset attempts" },
});

router.post("/send", resetLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        success: false,
        error: "Email required",
      });
    }

    // FIX: validate email format before hitting the DB or sending mail
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: "Invalid email format",
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Uniform response regardless of whether the account exists —
    // prevents email enumeration of registered doctors.
    const doc = await Doc.findOne({ email: cleanEmail }).select("_id").lean();

    if (!doc) {
      // Return 200 to avoid leaking account existence
      return res.json({ success: true });
    }

    const otp = generateOtp();

    await store.set(
      `reset:${cleanEmail}`,
      {
        hash: hashOtp(otp),
        verified: false,
      },
      OTP_TTL_MS,
    );

    await transporter.sendMail({
      from: `"InvoHealth" <${process.env.MAIL_USER}>`,
      to: cleanEmail,
      subject: "Your OTP for InvoHealth",
      html: `
                <div style="font-family:sans-serif">
                    <h2>Verify your email</h2>
                    <p>Your OTP is:</p>
                    <h1>${otp}</h1>
                    <p>This OTP is valid for 10 minutes.</p>
                </div>
            `,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("SEND OTP ERROR:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── POST /verify ─────────────────────────────────────────────────────────────
router.post("/verify", resetLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body;

    // FIX: input presence and type checks were missing entirely
    if (!email || typeof email !== "string") {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    if (!otp) {
      return res.status(400).json({
        success: false,
        error: "OTP is required",
      });
    }

    const otpStr = String(otp).replace(/\D/g, "");
    if (otpStr.length !== 6) {
      return res.status(400).json({
        success: false,
        error: "OTP must be 6 digits",
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    const record = await store.get(`reset:${cleanEmail}`);

    if (!record) {
      return res.status(400).json({
        success: false,
        error: "OTP expired or not found",
      });
    }

    const providedHash = hashOtp(otpStr);

    let isMatch = false;
    try {
      isMatch = crypto.timingSafeEqual(
        Buffer.from(providedHash, "utf8"),
        Buffer.from(record.hash, "utf8"),
      );
    } catch {
      return res.status(400).json({ success: false, error: "Invalid OTP" });
    }

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: "Invalid OTP",
      });
    }

    // Mark verified — TTL stays the same so the window doesn't extend
    const remainingTTL = record.expiresAt
      ? Math.max(record.expiresAt - Date.now(), 60_000)
      : OTP_TTL_MS;
    await store.set(
      `reset:${cleanEmail}`,
      { ...record, verified: true },
      remainingTTL,
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── POST /reset-password ──────────────────────────────────────────────────────
router.post("/reset-password", resetLimiter, async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 8 characters",
      });
    }
    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        error: "Password must contain at least one uppercase letter",
      });
    }
    if (!/[0-9]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        error: "Password must contain at least one number",
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    const record = await store.get(`reset:${cleanEmail}`);

    if (!record || !record.verified) {
      return res.status(403).json({
        success: false,
        error: "OTP not verified",
      });
    }

    const doc = await Doc.findOne({ email: cleanEmail });

    if (!doc) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const salt = await bcrypt.genSalt(10);
    doc.password = await bcrypt.hash(newPassword, salt);
    await doc.save();

    await store.delete(`reset:${cleanEmail}`);

    return res.json({
      success: true,
      message: "Password reset successful",
    });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    return res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

module.exports = router;
