const express = require("express");
const router = express.Router();
const Doc = require("../../models/Doc");
const bcrypt = require("bcryptjs");
const { encrypt } = require("../../utils/crypto");
const fetchuser = require("../../middleware/fetchuser");
const { rateLimit } = require("express-rate-limit");
const requireDoctor = require("../../middleware/requireDoctor");

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
});
// Allowed + Forbidden fields
const ALLOWED_FIELDS = [
    "name",
    "clinicName",
    "regNumber",
    "degree",
    "experience",
];

const FORBIDDEN_FIELDS = ["password", "role", "subscription", "usage"];

// Basic validator (can replace with Joi/Zod later)
const isValidString = (val) => typeof val === "string" && val.trim().length > 0;

// Reusable phone processor
const processPhone = async (value, existingHash, fieldPrefix) => {
    let clean = value.trim();

    if (!/^\+?\d{8,15}$/.test(clean)) {
        return null; // invalid
    }

    clean = clean.replace(/\D/g, "");

    if (existingHash) {
        const isSame = await bcrypt.compare(clean, existingHash);
        if (isSame) return null; // no update needed
    }

    return {
        [`${fieldPrefix}Hash`]: await bcrypt.hash(clean, 10),
        [`${fieldPrefix}Encrypted`]: encrypt(clean),
        [`${fieldPrefix}Last4`]: clean.slice(-4),
        [`${fieldPrefix}`]: "", // for unset
    };
};

router.put(
    "/update_profile",
    limiter,
    fetchuser,
    requireDoctor,
    async (req, res) => {
        try {
            const doctorId = req.user.doctorId;

            // Block forbidden fields explicitly
            for (const field of FORBIDDEN_FIELDS) {
                if (req.body[field] !== undefined) {
                    return res.status(400).json({
                        success: false,
                        error: `${field} cannot be updated via this route`,
                    });
                }
            }

            const existingDoc = await Doc.findById(doctorId);
            if (!existingDoc) {
                return res
                    .status(404)
                    .json({ success: false, error: "Doctor not found" });
            }

            const updateFields = {};
            const unsetFields = {};

            const { phone, appointmentPhone, countryCode, address, ...rest } =
                req.body;

            // Allowlist fields only
            ALLOWED_FIELDS.forEach((key) => {
                if (key === "degree" && Array.isArray(rest.degree)) {
                    updateFields.degree = rest.degree
                        .filter((d) => typeof d === "string" && d.trim() !== "")
                        .map((d) => d.trim());
                } else if (
                    rest[key] !== undefined &&
                    isValidString(rest[key])
                ) {
                    if (existingDoc[key] !== rest[key]) {
                        updateFields[key] = rest[key].trim();
                    }
                }
            });
            // Address
            const allowedAddressFields = [
                "line1",
                "line2",
                "line3",
                "city",
                "state",
                "pincode",
            ];

            if (
                address &&
                typeof address === "object" &&
                !Array.isArray(address)
            ) {
                allowedAddressFields.forEach((key) => {
                    if (isValidString(address[key])) {
                        updateFields[`address.${key}`] = address[key].trim();
                    }
                });
            }

            // Degree (separate)
            if (Array.isArray(rest.degree)) {
                updateFields.degree = rest.degree
                    .filter((d) => typeof d === "string" && d.trim() !== "")
                    .map((d) => d.trim());
            }

            if (countryCode && isValidString(countryCode)) {
                updateFields["address.countryCode"] = countryCode.trim();
            }

            // Phone
            if (phone) {
                const phoneData = await processPhone(
                    phone,
                    existingDoc.phoneHash,
                    "phone",
                );
                if (phoneData) {
                    Object.assign(updateFields, phoneData);
                    unsetFields.phone = "";
                }
            }

            // Appointment Phone
            if (appointmentPhone) {
                const apptPhoneData = await processPhone(
                    appointmentPhone,
                    existingDoc.appointmentPhoneHash,
                    "appointmentPhone",
                );
                if (apptPhoneData) {
                    Object.assign(updateFields, apptPhoneData);
                    unsetFields.appointmentPhone = "";
                }
            }

            // Nothing to update
            if (
                Object.keys(updateFields).length === 0 &&
                Object.keys(unsetFields).length === 0
            ) {
                return res.json({
                    success: true,
                    message: "No changes detected",
                });
            }

            // Build update query
            const updateQuery = { $set: updateFields };
            if (Object.keys(unsetFields).length > 0) {
                updateQuery.$unset = unsetFields;
            }

            const updated = await Doc.findByIdAndUpdate(doctorId, updateQuery, {
                new: true,
            }).lean();

            // Safe response (no sensitive fields)
            const safeDoctor = {
                _id: updated._id,
                name: updated.name,
                clinicName: updated.clinicName,
                regNumber: updated.regNumber,
                degree: updated.degree,
                experience: updated.experience,
                phoneLast4: updated.phoneLast4,
                appointmentPhoneLast4: updated.appointmentPhoneLast4,
                address: updated.address,
            };

            return res.json({ success: true, doctor: safeDoctor });
        } catch (err) {
            console.error("Update profile error:", err.message);
            return res.status(500).json({
                success: false,
                error: "Internal server error",
            });
        }
    },
);

module.exports = router;
