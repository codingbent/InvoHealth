const express = require("express");
const router = express.Router();
const Patient = require("../../models/Patient");
const fetchPatient = require("../../middleware/fetchpatient");
const { decrypt } = require("../../utils/crypto");

// GET patient profile
router.get("/details", fetchPatient, async (req, res) => {
    try {
        const patientId = req.patient?.id;

        if (!patientId) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized access",
            });
        }

        const patient = await Patient.findById(patientId)
            .select("-numberHash")
            .populate("doctors", "name specialization")
            .populate("country", "name dialCode currency code");

        if (!patient) {
            return res.status(404).json({
                success: false,
                error: "Patient not found",
            });
        }

        /* ─── SAFE PHONE DECRYPT ─── */
        let phone = "";
        if (patient.numberEncrypted) {
            try {
                phone = decrypt(patient.numberEncrypted);
            } catch (err) {
                console.error("Decrypt error:", err.message);
            }
        }

        /* ─── SAFE COUNTRY HANDLING ─── */
        const countryData = patient.country || {};

        /* ─── RESPONSE ─── */
        return res.json({
            success: true,
            patient: {
                id: patient._id,
                name: patient.name,
                email: patient.email || "",
                dob: patient.dob ? String(patient.dob).slice(0, 10) : "",
                age: patient.dob
                    ? (() => {
                          const today = new Date();

                          const birth = new Date(patient.dob);

                          let age = today.getFullYear() - birth.getFullYear();

                          const monthDiff = today.getMonth() - birth.getMonth();

                          if (
                              monthDiff < 0 ||
                              (monthDiff === 0 &&
                                  today.getDate() < birth.getDate())
                          ) {
                              age--;
                          }

                          return age >= 0 ? age : null;
                      })()
                    : (patient.age ?? null),

                gender: patient.gender ?? null,

                // PHONE
                number: phone || "",
                numberMasked: patient.numberLast4
                    ? `******${patient.numberLast4}`
                    : "",
                dialCode: countryData.dialCode || "",

                // COUNTRY
                country: countryData.name || "",
                currency: countryData.currency || "",
                countryCode: countryData.code || "",

                doctors: patient.doctors || [],
                date: patient.createdAt || patient.date || null,
            },
        });
    } catch (err) {
        console.error("PATIENT DETAILS ERROR:", err);
        return res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

module.exports = router;
