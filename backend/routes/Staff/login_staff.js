const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const Staff = require("../../models/Staff");
const JWT_SECRET = process.env.JWT_SECRET;
const { createLimiter } = require("../../middleware/ratelimiter");

// BCRYPT SALT ROUNDS — must stay consistent with add_staff.js
const PHONE_SALT_ROUNDS = 10;

router.post(
    "/login_staff",
    createLimiter({ max: 5, windowMs: 30 * 60 * 1000 }),
    async (req, res) => {
        try {
            const { phone, dialCode, password } = req.body;

            if (!phone || !password || !dialCode) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid credentials",
                });
            }

            const cleanPhone = String(phone)
                .replace(/\D/g, "")
                .replace(/^0+/, "");

            if (cleanPhone.length < 6 || cleanPhone.length > 15) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid credentials",
                });
            }

            const normalizedDialCode = String(dialCode).trim();
            const last4 = cleanPhone.slice(-4);

            // ── PHONE LOOKUP: phoneLast4 prefilter + compare ──
            //
            // bcrypt is not deterministic — we cannot do a direct equality
            // lookup on the stored hash. Instead we prefilter by phoneLast4
            // (indexed) then compare the stored hash against the supplied phone.
            //
            // MIGRATION FALLBACK: existing staff were hashed with SHA-256.
            // We detect those records (bcrypt hashes always start with "$2"),
            // compare via SHA-256 as a one-time fallback, and immediately
            // re-hash with bcrypt so next login uses the secure path.
            // No staff records are blocked, no manual migration script needed.
            const candidates = await Staff.find({
                phoneLast4: last4,
                isDeleted: false,
            })
                .populate("countryId", "dialCode")
                .select(
                    "+phoneHash +password isActive isDeleted role doctorId name countryId",
                );

            let staff = null;
            let needsRehash = false;

            for (const candidate of candidates) {
                if (!candidate.phoneHash) continue;

                const isBcrypt = candidate.phoneHash.startsWith("$2");

                let phoneMatches = false;

                if (isBcrypt) {
                    // Secure path: bcrypt compare
                    phoneMatches = await bcrypt.compare(
                        cleanPhone,
                        candidate.phoneHash,
                    );
                } else {
                    // Legacy path: SHA-256 compare — mark for upgrade
                    const legacyHash = crypto
                        .createHash("sha256")
                        .update(cleanPhone)
                        .digest("hex");

                    phoneMatches = legacyHash === candidate.phoneHash;

                    if (phoneMatches) needsRehash = true;
                }

                if (phoneMatches) {
                    staff = candidate;
                    break;
                }
            }

            // Generic error — do not reveal whether the phone exists
            if (!staff) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid credentials",
                });
            }

            // ── DIAL CODE CHECK ───────────────────────────────
            const storedDialCode = staff.countryId?.dialCode || "";

            if (storedDialCode !== normalizedDialCode) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid credentials",
                });
            }

            // ── ACTIVE / DELETED CHECK ────────────────────────
            if (!staff.isActive || staff.isDeleted) {
                return res.status(403).json({
                    success: false,
                    error: "You no longer have access. Contact your doctor.",
                });
            }

            // ── FIRST LOGIN: no password set yet ─────────────
            if (!staff.password) {
                // If phone hash needs upgrading, do it now before returning
                if (needsRehash) {
                    const { encrypt } = require("../../utils/crypto");
                    const newHash = await bcrypt.hash(
                        cleanPhone,
                        PHONE_SALT_ROUNDS,
                    );
                    const encrypted = encrypt(cleanPhone);
                    Staff.findByIdAndUpdate(staff._id, {
                        phoneHash: newHash,
                        phoneEncrypted: encrypted,
                    }).catch((e) =>
                        console.error(
                            "[staff login] phone rehash failed:",
                            e.message,
                        ),
                    );
                }

                const setupToken = jwt.sign(
                    {
                        staffId: staff._id,
                        purpose: "set_password",
                    },
                    JWT_SECRET,
                    {
                        expiresIn: "15m",
                        algorithm: "HS256",
                    },
                );

                return res.json({
                    success: true,
                    firstLogin: true,
                    setupToken,
                });
            }

            // ── PASSWORD CHECK ────────────────────────────────
            const match = await bcrypt.compare(password, staff.password);

            if (!match) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid credentials",
                });
            }

            // ── TRANSPARENT PHONE HASH UPGRADE ───────────────
            // If the phone was stored with SHA-256, upgrade to bcrypt silently
            // on this successful login. Fire-and-forget — login is not blocked
            // if the update fails (it will retry on next login).
            if (needsRehash) {
                const { encrypt } = require("../../utils/crypto");
                bcrypt
                    .hash(cleanPhone, PHONE_SALT_ROUNDS)
                    .then((newHash) => {
                        const encrypted = encrypt(cleanPhone);
                        return Staff.findByIdAndUpdate(staff._id, {
                            phoneHash: newHash,
                            phoneEncrypted: encrypted,
                        });
                    })
                    .catch((e) =>
                        console.error(
                            "[staff login] phone rehash failed:",
                            e.message,
                        ),
                    );
            }

            // ── ISSUE JWT ─────────────────────────────────────
            const token = jwt.sign(
                {
                    user: {
                        id: staff._id,
                        role: "staff",
                        staffRole: staff.role,
                        doctorId: staff.doctorId,
                    },
                },
                JWT_SECRET,
                {
                    expiresIn: "1d",
                    algorithm: "HS256",
                },
            );

            return res.json({
                success: true,
                token,
                role: staff.role,
                name: staff.name,
            });
        } catch (err) {
            console.error("login_staff error:", err);

            return res.status(500).json({
                success: false,
                error: "Server error",
            });
        }
    },
);

module.exports = router;
