const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Patient = require("../../../models/Patient");
const fetchuser = require("../../../middleware/fetchuser");

router.get("/patient_details/:id", fetchuser, async (req, res) => {
    try {
        const patientId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(patientId)) {
            return res.status(400).json({
                message: "Invalid patient ID",
            });
        }

        const patient = await Patient.findById(patientId).lean();

        if (!patient) {
            return res.status(404).json({
                message: "Patient not found",
            });
        }

        if (patient.doctor.toString() !== req.user.doctorId) {
            return res.status(403).json({
                message: "Unauthorized",
            });
        }

        let maskedNumber = "";

        const needsNumberUpdate = !patient.numberEncrypted;

        if (patient.numberLast4) {
            maskedNumber = `******${patient.numberLast4}`;
        } else if (patient.number) {
            maskedNumber = `******${patient.number.slice(-4)}`;
        }

        delete patient.number;
        delete patient.numberHash;
        delete patient.numberEncrypted;

        return res.json({
            ...patient,
            numberMasked: maskedNumber,
            needsNumberUpdate,
        });
    } catch (err) {
        console.error("patient_details error:", err);

        return res.status(500).json({
            message: "Error fetching patient",
        });
    }
});

module.exports = router;
