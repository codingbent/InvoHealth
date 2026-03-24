const express = require("express");
const router = express.Router();
const Patient = require("../../../models/Patient");
const { decrypt } = require("../../../utils/crypto");
const fetchuser = require("../../../middleware/fetchuser");

router.get("/get_full_number/:id", fetchuser, async (req, res) => {
    try {
        const doctorId = req.user.doctorId;

        const patient = await Patient.findById(req.params.id);

        if (!patient) {
            return res.status(404).json({ error: "Patient not found" });
        }

        // 🔐 SECURITY CHECK
        if (patient.doctor.toString() !== doctorId) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        let fullNumber = null;

        // ✅ New encrypted data
        if (patient.numberEncrypted) {
            try {
                fullNumber = decrypt(patient.numberEncrypted);
            } catch (err) {
                console.error("Decrypt error:", err);
            }
        }

        // ⚠️ Old data fallback
        else if (patient.number) {
            fullNumber = patient.number;
        }

        res.json({
            success: true,
            number: fullNumber,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;