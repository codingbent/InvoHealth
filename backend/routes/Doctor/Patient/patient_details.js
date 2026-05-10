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

        if (!req.user?.doctorId) {
            return res.status(401).json({
                message: "Unauthorized - no doctor context",
            });
        }

        const doctorId = req.user.doctorId.toString();

        // SUPPORT BOTH SCHEMA
        const isAuthorized =
            (Array.isArray(patient.doctors) &&
                patient.doctors.some((d) => d.toString() === doctorId)) ||
            (patient.doctor && patient.doctor.toString() === doctorId);

        if (!isAuthorized) {
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

        const calculateAge = (dob) => {
            if (!dob) return null;

            const birth = new Date(dob);

            if (isNaN(birth.getTime())) {
                return null;
            }

            const today = new Date();

            let age = today.getFullYear() - birth.getFullYear();

            const monthDiff = today.getMonth() - birth.getMonth();

            if (
                monthDiff < 0 ||
                (monthDiff === 0 && today.getDate() < birth.getDate())
            ) {
                age--;
            }

            return age >= 0 ? age : null;
        };

        const computedAge = patient.dob
            ? calculateAge(patient.dob)
            : (patient.age ?? null);

        return res.json({
            ...patient,

            age: computedAge,
            dob: patient.dob ? String(patient.dob).slice(0, 10) : "",

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
