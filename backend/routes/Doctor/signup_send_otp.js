const express = require("express");
const router = express.Router();
const Doc = require("../../models/Doc");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const {
    store,
    hashOtp,
    generateOtp,
    OTP_TTL_MS,
} = require("../../utils/otpUtils");
const { transporter } = require("../../utils/mailer");
const otpLimiter = rateLimit({
    windowMs: 30 * 60 * 1000,
    max: 5,
    keyGenerator: (req) => req.body.email || ipKeyGenerator(req),
});

// ── Helper: build the OTP email HTML ─────────────────────────────────────────
const buildOtpEmail = (otp) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#f0ede8;font-family:'DM Sans',sans-serif;font-weight:400;-webkit-font-smoothing:antialiased;padding:40px 16px 60px}
  .wrapper{max-width:520px;margin:0 auto}
  .card{background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06),0 8px 32px rgba(0,0,0,.07)}
  .hero{background:#0f1923;padding:44px 44px 36px;position:relative;overflow:hidden}
  .hero-eyebrow{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#4a8c7a;margin-bottom:12px}
  .hero-title{font-size:32px;line-height:1.15;color:#fff;margin-bottom:4px}
  .hero-title em{font-style:italic;color:#a8d5c8}
  .hero-sub{font-size:13px;color:rgba(255,255,255,.38);margin-top:10px;font-weight:300;line-height:1.6}
  .divider-strip{height:3px;background:linear-gradient(90deg,#2db891 0%,#a8d5c8 50%,#f0ede8 100%)}
  .body{padding:40px 44px}
  .greeting{font-size:14px;color:#6b7280;margin-bottom:28px;line-height:1.7;font-weight:300}
  .otp-block{background:#f7f5f2;border:1px solid #e8e3db;border-radius:14px;padding:32px 24px;text-align:center;margin-bottom:28px}
  .otp-label{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#9ca3af;margin-bottom:16px}
  .otp-code{font-size:52px;letter-spacing:14px;color:#0f1923;line-height:1;margin-bottom:16px;padding-left:14px;font-weight:700}
  .otp-timer{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid #e8e3db;border-radius:20px;padding:5px 14px;font-size:11px;color:#6b7280;letter-spacing:.04em}
  .otp-timer-dot{width:6px;height:6px;border-radius:50%;background:#2db891;flex-shrink:0}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:32px}
  .info-card{background:#f7f5f2;border-radius:10px;padding:14px 16px;border:1px solid #e8e3db}
  .info-card-label{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#9ca3af;margin-bottom:4px}
  .info-card-value{font-size:12px;color:#374151;font-weight:500}
  .warning-note{background:#fffbeb;border:1px solid #fde68a;border-left:3px solid #f59e0b;border-radius:8px;padding:12px 14px;font-size:11px;color:#92400e;line-height:1.6;margin-bottom:32px}
  .rule{height:1px;background:#e8e3db;margin-bottom:28px}
  .footer-sign{display:flex;justify-content:center;font-size:16px;color:#0f1923;margin-bottom:2px}
  .bottom{background:#f7f5f2;border-top:1px solid #e8e3db;padding:20px 44px;display:flex;align-items:center;justify-content:space-between;gap:16px}
  .bottom-links{display:flex;gap:16px}
  .bottom-links a{font-size:11px;color:#9ca3af;text-decoration:none;letter-spacing:.04em}
  .bottom-copy{font-size:11px;color:#c4bdb5;letter-spacing:.04em}
  .legal{text-align:center;margin-top:24px;font-size:10px;color:#b0a89e;line-height:1.7;letter-spacing:.03em}
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="hero">
      <div class="hero-eyebrow">Security Verification</div>
      <h1 class="hero-title">Verify your<br><em>email address</em></h1>
      <p class="hero-sub">Use the code below to complete your sign-up and access your clinic dashboard.</p>
    </div>
    <div class="divider-strip"></div>
    <div class="body">
      <p class="greeting">Hi Doctor, we received a request to verify your email. Enter the one-time code below — it's valid for the next 10 minutes.</p>
      <div class="otp-block">
        <div class="otp-label">Your one-time code</div>
        <div class="otp-code">${otp}</div>
        <div class="otp-timer">
          <span class="otp-timer-dot"></span>
          Expires in 10 minutes
        </div>
      </div>
      <div class="info-grid">
        <div class="info-card">
          <div class="info-card-label">Single use only</div>
          <div class="info-card-value">Do not share this code</div>
        </div>
        <div class="info-card">
          <div class="info-card-label">Didn't request this?</div>
          <div class="info-card-value">Ignore this email safely</div>
        </div>
      </div>
      <div class="warning-note">⚠ InvoHealth will <strong>never</strong> ask for this code via phone or chat. If someone is requesting it, do not share it.</div>
      <div class="rule"></div>
      <div class="footer-sign">Team InvoHealth</div>
    </div>
    <div class="bottom">
      <div class="bottom-links">
        <a href="https://invohealth.vercel.app/terms">Terms and Conditions</a>
        <a href="https://invohealth.vercel.app/privacy">Privacy Policy</a>
      </div>
      <span class="bottom-copy">© 2026 InvoHealth</span>
    </div>
  </div>
  <p class="legal">This email was sent because an account was created using your address.<br>If this wasn't you, you can safely ignore this message.</p>
</div>
</body>
</html>`;

// ── SEND OTP ──────────────────────────────────────────────────────────────────
router.post("/signup_send_otp", otpLimiter, async (req, res) => {
    try {
        const { email } = req.body;
        const normalizedEmail = email?.toLowerCase().trim();
        if (
            !normalizedEmail ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
        ) {
            return res
                .status(400)
                .json({ success: false, error: "Valid email is required" });
        }
        const existing = await Doc.findOne({ email: normalizedEmail });
        if (existing) {
            return res
                .status(400)
                .json({ success: false, error: "Email already registered" });
        }
        const otp = generateOtp();
        await store.set(normalizedEmail, { hash: hashOtp(otp) }, OTP_TTL_MS);
        await transporter.sendMail({
            from: `"InvoHealth" <${process.env.MAIL_USER}>`,
            to: normalizedEmail,
            subject: "Your InvoHealth Verification Code",
            html: buildOtpEmail(otp),
        });
        return res.json({ success: true, message: "OTP sent successfully" });
    } catch (err) {
        console.error("SEND OTP ERROR:", err.message);
        return res
            .status(500)
            .json({ success: false, error: "Failed to send OTP" });
    }
});

module.exports = router;
