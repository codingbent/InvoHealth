const express = require("express");
const router = express.Router();
const Doc = require("../../models/Doc");
const bcrypt = require("bcryptjs");
const { encrypt } = require("../../utils/crypto");
const fetchuser = require("../../middleware/fetchuser");

router.put("/update_profile", fetchuser, async (req, res) => {
    try {
        const doctorId = req.user.doctorId;

        const existingDoc = await Doc.findById(doctorId);
        if (!existingDoc) {
            return res.status(404).json({
                success: false,
                error: "Doctor not found",
            });
        }

        const updateFields = {};
        const unsetFields = {};

        const { phone, appointmentPhone, ...rest } = req.body;

        // normal fields
        Object.keys(rest).forEach((key) => {
            updateFields[key] = rest[key];
        });

        // 🔐 PHONE
        if (phone) {
            const clean = phone.trim();

            // ❌ ignore masked values
            if (!/^\d{10}$/.test(clean)) {
                console.log("Skipping invalid phone:", clean);
            } else {
                let shouldUpdate = true;

                if (existingDoc.phoneHash) {
                    const isSame = await bcrypt.compare(
                        clean,
                        existingDoc.phoneHash,
                    );
                    if (isSame) shouldUpdate = false;
                }

                if (shouldUpdate) {
                    updateFields.phoneHash = await bcrypt.hash(clean, 10);
                    updateFields.phoneEncrypted = encrypt(clean);
                    updateFields.phoneLast4 = clean.slice(-4);

                    unsetFields.phone = "";
                }
            }
        }

        if (appointmentPhone) {
            const clean = appointmentPhone.trim();

            if (!/^\d{10}$/.test(clean)) {
                console.log("Skipping invalid appt phone:", clean);
            } else {
                let shouldUpdate = true;

                if (existingDoc.appointmentPhoneHash) {
                    const isSame = await bcrypt.compare(
                        clean,
                        existingDoc.appointmentPhoneHash,
                    );
                    if (isSame) shouldUpdate = false;
                }

                if (shouldUpdate) {
                    updateFields.appointmentPhoneHash = await bcrypt.hash(
                        clean,
                        10,
                    );
                    updateFields.appointmentPhoneEncrypted = encrypt(clean);
                    updateFields.appointmentPhoneLast4 = clean.slice(-4);

                    unsetFields.appointmentPhone = "";
                }
            }
        }
        // FINAL QUERY
        const updateQuery = {
            $set: updateFields,
        };

        if (Object.keys(unsetFields).length > 0) {
            updateQuery.$unset = unsetFields;
        }

        const updated = await Doc.findByIdAndUpdate(doctorId, updateQuery, {
            new: true,
        });

        res.json({
            success: true,
            doctor: updated,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

module.exports = router;
