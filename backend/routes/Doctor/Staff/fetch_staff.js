const express = require("express");
const router = express.Router();
const Staff = require("../../../models/Staff");
const fetchuser = require("../../../middleware/fetchuser");
const requireDoctor = require("../../../middleware/requireDoctor");
const { decrypt } = require("../../../utils/crypto");

router.get("/fetch_staff", fetchuser, requireDoctor, async (req, res) => {
    try {
        const doctorId = req.user.doctorId;

        // FIX: Do NOT exclude phoneEncrypted here — we need it to build phoneMasked
        // and phoneDecrypted for the doctor's own staff list view.
        // phoneHash is still excluded (no need to expose the hash).
        const staffDocs = await Staff.find({
            doctorId,
            isDeleted: false,
        })
            .select("-phoneHash") // exclude hash (useless to client)
            .select("+phoneEncrypted") // include encrypted field (schema hides it by default)
            .sort({ createdAt: -1 });

        const staff = staffDocs.map((s) => {
            const doc = s.toObject();

            // build masked display number
            if (doc.phoneLast4) {
                doc.phoneMasked = `${"•".repeat(6)}${doc.phoneLast4}`;
            } else if (doc.phone) {
                // legacy pre-migration record
                const last4 = doc.phone.slice(-4);
                doc.phoneMasked = `${"•".repeat(Math.max(doc.phone.length - 4, 4))}${last4}`;
                doc.phoneLast4 = last4;
            }

            // decrypt for reveal-on-demand in the doctor's staff list
            // (the doctor owns these records; reveal is gated by eye-button click in UI)
            if (s.phoneEncrypted) {
                try {
                    doc.phoneDecrypted = decrypt(s.phoneEncrypted);
                } catch {
                    doc.phoneDecrypted = null;
                }
            }

            // strip raw fields before sending
            delete doc.phoneEncrypted;
            delete doc.phone; // legacy plaintext field

            return doc;
        });

        return res.json({
            success: true,
            staff,
        });
    } catch (err) {
        console.error("fetch_staff error:", err);

        return res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

module.exports = router;
