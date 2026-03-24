const express = require("express");
const router = express.Router();
const Patient = require("../../../models/Patient");
var fetchuser = require("../../../middleware/fetchuser");

router.get("/patient_details/:id", fetchuser, async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id).lean();
        if (!patient) {
            return res.status(404).json({ message: "Patient not found" });
        }

        if (patient.doctor.toString() !== req.user.doctorId) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        let maskedNumber = "";

        let plainNumber = null;

        if (patient.number && !patient.numberEncrypted) {
            plainNumber = patient.number;
        }

        const needsNumberUpdate = !patient.numberEncrypted;

        if (patient.numberLast4) {
            maskedNumber = `******${patient.numberLast4}`;
        } else if (patient.number) {
            maskedNumber = `******${patient.number.slice(-4)}`;
        }

        delete patient.number;
        delete patient.numberHash;
        delete patient.numberEncrypted;

        res.json({
            ...patient,
            numberMasked: maskedNumber,
            needsNumberUpdate,
            plainNumber,
        });
    } catch (err) {
        res.status(500).json({
            message: "Error fetching patient",
            error: err.message,
        });
    }
});

module.exports = router;
