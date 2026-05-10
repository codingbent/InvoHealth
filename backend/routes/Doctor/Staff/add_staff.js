const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const Staff = require("../../../models/Staff");
const Doctor = require("../../../models/Doc");
const fetchuser = require("../../../middleware/fetchuser");
const requireDoctor = require("../../../middleware/requireDoctor");
const requireSubscription = require("../../../middleware/requiresubscription");
const { getPricing } = require("../../../utils/pricingcache");
const { getSubscriptionStatus } = require("../../../utils/subscription_check");
const { encrypt } = require("../../../utils/crypto");

const PHONE_SALT_ROUNDS = 10;

router.post(
    "/add_staff",
    fetchuser,
    requireDoctor,
    requireSubscription,
    async (req, res) => {
        try {
            const doctorId = req.user.doctorId;

            if (!doctorId) {
                return res.status(401).json({
                    success: false,
                    error: "Unauthorized",
                });
            }

            const { name, phone, role, canUploadImages } = req.body;

            // ── VALIDATION ─────────────────────────────────────
            if (!name || !phone || !role) {
                return res.status(400).json({
                    success: false,
                    error: "All fields are required",
                });
            }

            const normalizedName = String(name).trim();

            const normalizedCanUploadImages =
                canUploadImages === undefined
                    ? true
                    : canUploadImages === true || canUploadImages === "true";

            if (!normalizedName) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid name",
                });
            }

            if (!["receptionist", "assistant", "nurse"].includes(role)) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid role",
                });
            }

            // ── FETCH DOCTOR ───────────────────────────────────
            const doctor =
                await Doctor.findById(doctorId).populate("address.countryId");

            if (!doctor) {
                return res.status(404).json({
                    success: false,
                    error: "Doctor not found",
                });
            }

            // ── STAFF LIMIT ────────────────────────────────────
            const subStatus = getSubscriptionStatus(doctor.subscription);
            const plan = doctor.subscription?.plan?.toLowerCase();
            const pricing = await getPricing();

            if (!pricing) {
                return res.status(500).json({
                    success: false,
                    error: "Pricing not configured",
                });
            }

            let staffLimit = 0;

            if (subStatus === "active" && plan && pricing[plan]) {
                staffLimit = pricing[plan].staffLimit;
            }

            // ── NORMALIZE PHONE ───────────────────────────────
            const cleanPhone = String(phone)
                .replace(/\D/g, "")
                .replace(/^0+/, "");

            if (cleanPhone.length < 8 || cleanPhone.length > 15) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid phone number",
                });
            }

            const last4 = cleanPhone.slice(-4);

            // ── DUPLICATE CHECK (bcrypt prefilter pattern) ────
            // bcrypt is not deterministic — we cannot do a direct hash lookup.
            // Instead, prefilter by phoneLast4 (already indexed) to get a small
            // candidate set, then bcrypt.compare() each candidate.
            // This is the same pattern used for patients.
            const candidates = await Staff.find({
                phoneLast4: last4,
                isDeleted: false,
            })
                .select("+phoneHash doctorId")
                .lean();

            for (const candidate of candidates) {
                // Skip records that still have a legacy SHA-256 hash (64 hex
                // chars). Those will be migrated on first login via login_staff.
                if (
                    candidate.phoneHash &&
                    !candidate.phoneHash.startsWith("$2")
                ) {
                    // SHA-256 hash — compare deterministically
                    const crypto = require("crypto");
                    const legacyHash = crypto
                        .createHash("sha256")
                        .update(cleanPhone)
                        .digest("hex");

                    if (legacyHash !== candidate.phoneHash) continue;
                } else if (candidate.phoneHash) {
                    // bcrypt hash — timing-safe compare
                    const matches = await bcrypt.compare(
                        cleanPhone,
                        candidate.phoneHash,
                    );
                    if (!matches) continue;
                } else {
                    continue;
                }

                // Found a matching phone — report the right error
                if (candidate.doctorId.toString() !== doctorId.toString()) {
                    return res.status(400).json({
                        success: false,
                        error: "This phone number is already registered with another doctor.",
                    });
                }

                return res.status(400).json({
                    success: false,
                    error: "Staff with this phone number already exists in your clinic.",
                });
            }

            // ── ACTIVE STAFF COUNT ────────────────────────────
            const currentStaffCount = await Staff.countDocuments({
                doctorId,
                isActive: true,
                isDeleted: false,
            });

            if (staffLimit !== -1 && currentStaffCount >= staffLimit) {
                return res.status(403).json({
                    success: false,
                    error: `Staff limit reached (${staffLimit}). Upgrade your plan.`,
                });
            }

            const phoneHash = await bcrypt.hash(cleanPhone, PHONE_SALT_ROUNDS);

            // ── ENCRYPT PHONE ─────────────────────────────────
            const phoneEncrypted = encrypt(cleanPhone);

            // ── CREATE STAFF ──────────────────────────────────
            const staff = await Staff.create({
                doctorId,
                countryId: doctor.address?.countryId?._id || null,
                name: normalizedName,
                phoneEncrypted,
                phoneHash,
                phoneLast4: last4,
                role,
                canUploadImages: normalizedCanUploadImages,
            });

            return res.json({
                success: true,
                staff: {
                    _id: staff._id,
                    name: staff.name,
                    phoneMasked: `${"•".repeat(
                        Math.max(cleanPhone.length - 4, 4),
                    )}${last4}`,
                    phoneLast4: staff.phoneLast4,
                    role: staff.role,
                    isActive: staff.isActive,
                    isDeleted: staff.isDeleted,
                    doctorId: staff.doctorId,
                    createdAt: staff.createdAt,
                    canUploadImages: staff.canUploadImages,
                },
            });
        } catch (err) {
            console.error("add_staff error:", err);

            return res.status(500).json({
                success: false,
                error: "Server error",
            });
        }
    },
);

module.exports = router;
