const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const Staff = require("../../../models/Staff");
const Doctor = require("../../../models/Doc");
const fetchuser = require("../../../middleware/fetchuser");
const requireDoctor = require("../../../middleware/requireDoctor");
const { encrypt } = require("../../../utils/crypto");

// BCRYPT SALT ROUNDS — keep in sync with add_staff.js and login_staff.js
const PHONE_SALT_ROUNDS = 10;

router.put("/edit_staff/:id", fetchuser, requireDoctor, async (req, res) => {
    try {
        const doctorId = req.user.doctorId;

        const { name, phone, role } = req.body;

        // ── VALIDATE OBJECT ID ─────────────────────
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                error: "Invalid staff ID",
            });
        }

        // ── FETCH STAFF ────────────────────────────
        const staff = await Staff.findOne({
            _id: req.params.id,
            doctorId,
            isDeleted: false,
        });

        if (!staff) {
            return res.status(404).json({
                success: false,
                error: "Staff not found",
            });
        }

        // ── NAME ───────────────────────────────────
        if (name !== undefined) {
            const trimmed = String(name).trim();

            if (!trimmed) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid name",
                });
            }

            staff.name = trimmed;
        }

        // ── ROLE ───────────────────────────────────
        if (role !== undefined) {
            if (!["receptionist", "assistant", "nurse"].includes(role)) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid role",
                });
            }

            staff.role = role;
        }

        // ── PHONE ──────────────────────────────────
        if (phone !== undefined && phone !== "") {
            const doctor =
                await Doctor.findById(doctorId).populate("address.countryId");

            if (!doctor) {
                return res.status(404).json({
                    success: false,
                    error: "Doctor not found",
                });
            }

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

            const candidates = await Staff.find({
                phoneLast4: last4,
                isDeleted: false,
                _id: { $ne: staff._id },
            })
                .select("+phoneHash")
                .lean();

            for (const candidate of candidates) {
                if (!candidate.phoneHash) continue;

                const isBcrypt = candidate.phoneHash.startsWith("$2");
                let phoneMatches = false;

                if (isBcrypt) {
                    phoneMatches = await bcrypt.compare(
                        cleanPhone,
                        candidate.phoneHash,
                    );
                } else {
                    // Legacy SHA-256 candidate — compare deterministically
                    const legacyHash = crypto
                        .createHash("sha256")
                        .update(cleanPhone)
                        .digest("hex");

                    phoneMatches = legacyHash === candidate.phoneHash;
                }

                if (phoneMatches) {
                    return res.status(400).json({
                        success: false,
                        error: "A staff member with this phone number already exists.",
                    });
                }
            }

            // ── HASH WITH BCRYPT ────────────────────────────
            const phoneHash = await bcrypt.hash(cleanPhone, PHONE_SALT_ROUNDS);

            staff.phoneEncrypted = encrypt(cleanPhone);
            staff.phoneHash = phoneHash;
            staff.phoneLast4 = last4;
            staff.countryId = doctor.address?.countryId?._id || null;
        }

        await staff.save();

        return res.json({
            success: true,
            staff: {
                _id: staff._id,
                name: staff.name,
                phoneMasked: staff.phoneLast4
                    ? `${"•".repeat(6)}${staff.phoneLast4}`
                    : "••••••••",
                phoneLast4: staff.phoneLast4,
                role: staff.role,
                isActive: staff.isActive,
                isDeleted: staff.isDeleted,
                doctorId: staff.doctorId,
                createdAt: staff.createdAt,
            },
        });
    } catch (err) {
        console.error("edit_staff error:", err);

        return res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

module.exports = router;
