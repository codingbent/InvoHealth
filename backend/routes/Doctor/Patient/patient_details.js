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

        // POPULATE COUNTRY
        const patient = await Patient.findById(patientId)
            .populate("country", "name dialCode")
            .lean();

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
        }

        // CLEAN SENSITIVE DATA
        delete patient.number;
        delete patient.numberHash;
        delete patient.numberEncrypted;

        // IMPORTANT FIX
        return res.json({
            ...patient,

            countryId: patient.country?._id || "",
            countryName: patient.country?.name || "",
            dialCode: patient.country?.dialCode || "",

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
