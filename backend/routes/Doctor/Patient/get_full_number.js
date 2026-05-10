const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Patient = require("../../../models/Patient");
const { decrypt } = require("../../../utils/crypto");
const fetchuser = require("../../../middleware/fetchuser");

router.get("/get_full_number/:id", fetchuser, async (req, res) => {
    try {
        const doctorId =
            req.user.role === "doctor"
                ? req.user.id
                : req.user.doctorId;

        const patientId = req.params.id;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(patientId)) {
            return res.status(400).json({
                success: false,
                error: "Invalid patient ID",
            });
        }

        const patient = await Patient.findById(patientId);

        if (!patient) {
            return res.status(404).json({
                success: false,
                error: "Patient not found",
            });
        }

        // FIX: doctors is ARRAY → use includes
        const isAuthorized = patient.doctors.some(
            (docId) => docId.toString() === doctorId.toString()
        );

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                error: "Unauthorized access",
            });
        }

        let fullNumber = null;

        // Encrypted number
        if (patient.numberEncrypted) {
            try {
                fullNumber = decrypt(patient.numberEncrypted);
            } catch (err) {
                console.error("Decrypt error:", err.message);
            }
        }

        // fallback (legacy)
        else if (patient.number) {
            fullNumber = patient.number;
        }

        return res.json({
            success: true,
            number: fullNumber || "",
        });
    } catch (err) {
        console.error("GET FULL NUMBER ERROR:", err);
        return res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

module.exports = router;