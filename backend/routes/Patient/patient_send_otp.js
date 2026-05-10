const express = require("express");
const router = express.Router();
const Patient = require("../../models/Patient");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const {
    store,
    hashOtp,
    generateOtp,
    OTP_TTL_MS,
} = require("../../utils/otpUtils");

const fetchpatient = require("../../middleware/fetchpatient");
const { transporter } = require("../../utils/mailer");

// ─────────────────────────────────────────────────────────────
// Rate Limiters
// ─────────────────────────────────────────────────────────────

const changeEmailLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    keyGenerator: (req) => req.patient?.id ?? ipKeyGenerator(req),
    standardHeaders: true,
    legacyHeaders: false,
});

const sendOtpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyGenerator: (req) =>
        typeof req.body?.email === "string"
            ? req.body.email.toLowerCase().trim()
            : ipKeyGenerator(req),

    standardHeaders: true,
    legacyHeaders: false,

    handler: (_req, res) =>
        res.status(429).json({
            success: false,
            error: "Too many requests. Try again in 15 minutes.",
        }),
});

// ─────────────────────────────────────────────────────────────
// Email Template
// ─────────────────────────────────────────────────────────────

const buildOtpEmail = (otp, patientName) => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#f0ede8;font-family:sans-serif;padding:40px 16px 60px}
  .wrapper{max-width:520px;margin:0 auto}
  .brand{text-align:center;margin-bottom:24px}
  .brand img{height:44px;object-fit:contain}
  .brand-name{font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-.5px;margin-top:8px}
  .brand-name em{font-style:italic;color:#2d59b8}
  .card{background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.07)}
  .hero{background:#0f1923;padding:44px 44px 36px}
  .hero-eyebrow{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#4a8c7a;margin-bottom:12px}
  .hero-title{font-size:28px;color:#fff;margin-bottom:4px}
  .hero-title em{font-style:italic;color:#a8d5c8}
  .hero-sub{font-size:13px;color:rgba(255,255,255,.38);margin-top:10px;line-height:1.6}
  .divider-strip{height:3px;background:linear-gradient(90deg,#2db891,#a8d5c8,#f0ede8)}
  .body{padding:40px 44px}
  .greeting{font-size:14px;color:#6b7280;margin-bottom:28px;line-height:1.7}
  .otp-block{background:#f7f5f2;border:1px solid #e8e3db;border-radius:14px;padding:32px 24px;text-align:center;margin-bottom:28px}
  .otp-label{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#9ca3af;margin-bottom:16px}
  .otp-code{font-size:52px;letter-spacing:14px;color:#0f1923;line-height:1;margin-bottom:16px;padding-left:14px;font-weight:700}
  .otp-timer{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid #e8e3db;border-radius:20px;padding:5px 14px;font-size:11px;color:#6b7280}
  .otp-timer-dot{width:6px;height:6px;border-radius:50%;background:#2db891}
  .warning-note{background:#fffbeb;border:1px solid #fde68a;border-left:3px solid #f59e0b;border-radius:8px;padding:12px 14px;font-size:11px;color:#92400e;line-height:1.6;margin-bottom:28px}
  .bottom{background:#f7f5f2;border-top:1px solid #e8e3db;padding:20px 44px;display:flex;justify-content:space-between;align-items:center}
  .bottom a{font-size:11px;color:#9ca3af;text-decoration:none}
  .bottom-copy{font-size:11px;color:#c4bdb5}
  .legal{text-align:center;margin-top:24px;font-size:10px;color:#b0a89e;line-height:1.7}
</style>
</head>
<body>
<div class="wrapper">

  <!-- Brand header -->
  

  <div class="card">
    <div class="hero"><div class="brand">
    <!-- Replace the src below with your actual logo URL -->
    <img src="https://invohealth.vercel.app/logo.jpg" alt="InvoHealth logo" />
    <div class="brand-name">Invo<em>Health</em></div>
  </div>
      <div class="hero-eyebrow">Patient Portal</div>
      <h1 class="hero-title">Your login<br><em>verification code</em></h1>
      <p class="hero-sub">Use the code below to sign in to your InvoHealth patient portal.</p>
    </div>
    <div class="divider-strip"></div>
    <div class="body">
      <p class="greeting">Hi ${patientName || "there"}, use this one-time code to log in. It expires in 10 minutes.</p>
      <div class="otp-block">
        <div class="otp-label">Your one-time login code</div>
        <div class="otp-code">${otp}</div>
        <div class="otp-timer">
          <span class="otp-timer-dot"></span>
          Expires in 10 minutes
        </div>
      </div>
      <div class="warning-note">&#9888; InvoHealth will <strong>never</strong> ask for this code via phone or chat. Do not share it with anyone.</div>
    </div>
    <p class="legal">If you didn't request this code, you can safely ignore this email.</p>
    <div class="bottom">
      <div style="display:flex;gap:16px">
        <a href="https://invohealth.vercel.app/terms">Terms</a>
        <a href="https://invohealth.vercel.app/privacy">Privacy</a>
      </div>
      <span class="bottom-copy">&copy; 2026 InvoHealth</span>
    </div>
  </div>
</div>
</body>
</html>`;

// ─────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────

const validateEmail = (email) =>
    typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// ─────────────────────────────────────────────────────────────
// POST /api/patient/send_otp
// ─────────────────────────────────────────────────────────────

router.post("/send_otp", sendOtpLimiter, async (req, res) => {
    try {
        const { email } = req.body;

        // Validate Email
        if (!validateEmail(email)) {
            return res.status(400).json({
                success: false,
                error: "Valid email is required",
            });
        }

        const cleanEmail = email.toLowerCase().trim();

        // Find Patient
        const patient = await Patient.findOne({
            email: cleanEmail,
        }).lean();

        // Prevent account enumeration
        if (!patient) {
            return res.json({
                success: true,
                message: "OTP sent",
            });
        }

        // Generate OTP
        const otp = generateOtp();

        // Store OTP in Redis
        try {
            await store.set(
                `login:${cleanEmail}`,
                {
                    hash: hashOtp(otp),
                },
                OTP_TTL_MS,
            );
        } catch (redisErr) {
            console.error("[REDIS STORE OTP ERROR]:", redisErr.message);

            return res.status(500).json({
                success: false,
                error: "OTP service unavailable",
            });
        }

        // Send Email
        try {
            await transporter.sendMail({
                from: `"InvoHealth" <${process.env.MAIL_USER}>`,
                to: cleanEmail,
                subject: "Your InvoHealth Login Code",
                html: buildOtpEmail(otp, patient?.name || ""),
            });
        } catch (mailErr) {
            console.error("[MAIL SEND ERROR]:", mailErr.message);
            await store.delete(`login:${cleanEmail}`);

            return res.status(500).json({
                success: false,
                error: "Failed to send OTP email",
            });
        }

        return res.json({
            success: true,
            message: "OTP sent",
        });
    } catch (err) {
        console.error("PATIENT SEND OTP ERROR:", err);

        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
});

// ─────────────────────────────────────────────────────────────
// POST /api/patient/change-email/send-otp
// ─────────────────────────────────────────────────────────────

router.post(
    "/change-email/send-otp",
    fetchpatient,
    changeEmailLimiter,
    async (req, res) => {
        try {
            const { email } = req.body;

            if (!validateEmail(email)) {
                return res.status(400).json({
                    success: false,
                    error: "Valid email required",
                });
            }

            const cleanEmail = email.toLowerCase().trim();

            // Prevent duplicate emails
            const exists = await Patient.findOne({
                email: cleanEmail,
            }).lean();

            if (exists) {
                return res.status(400).json({
                    success: false,
                    error: "Email already in use",
                });
            }

            const otp = generateOtp();

            // Store OTP
            try {
                await store.set(
                    `change-email:${req.patient.id}`,
                    {
                        hash: hashOtp(otp),
                        newEmail: cleanEmail,
                    },
                    OTP_TTL_MS,
                );
            } catch (redisErr) {
                console.error("[CHANGE EMAIL REDIS ERROR]:", redisErr.message);

                return res.status(500).json({
                    success: false,
                    error: "OTP service unavailable",
                });
            }

            // Send Email
            try {
                await transporter.sendMail({
                    from: `"InvoHealth" <${process.env.MAIL_USER}>`,
                    to: cleanEmail,
                    subject: "Verify your new InvoHealth email",
                    html: buildOtpEmail(otp, ""),
                });
            } catch (mailErr) {
                console.error("[CHANGE EMAIL MAIL ERROR]:", mailErr.message);
                await store.delete(`change-email:${req.patient.id}`);

                return res.status(500).json({
                    success: false,
                    error: "Failed to send OTP email",
                });
            }

            return res.json({
                success: true,
                message: "OTP sent",
            });
        } catch (err) {
            console.error("CHANGE EMAIL OTP ERROR:", err);

            return res.status(500).json({
                success: false,
                error: "Internal server error",
            });
        }
    },
);

module.exports = router;
