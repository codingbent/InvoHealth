const express = require("express");
const router = express.Router();
const Patient = require("../../models/Patient");
const { decrypt } = require("../../utils/crypto");
const fetchPatient = require("../../middleware/fetchpatient");

// GET /api/patient/doctors
router.get("/doctors", fetchPatient, async (req, res) => {
    try {
        let patient = await Patient.findById(req.patient.id)
            .populate({
                path: "doctors",
                select: "name specialization clinicName phoneEncrypted appointmentPhoneEncrypted country address",
                populate: {
                    path: "address",
                    select: "city",
                },
            })
            .lean();

        if (!patient) {
            return res
                .status(404)
                .json({ success: false, error: "Patient not found" });
        }

        // HANDLE OLD DATA (doctor → doctors[])
        let doctorsList = patient.doctors || [];

        if (!doctorsList.length && patient.doctor) {
            const oldDoctor = await require("../../models/Doc")
                .findById(patient.doctor)
                .select(
                    "name specialization clinicName phoneEncrypted appointmentPhoneEncrypted country address",
                )
                .populate("address", "city")
                .lean();

            if (oldDoctor) doctorsList = [oldDoctor];
        }

        const doctors = doctorsList.map((doc) => {
            const { phoneEncrypted, appointmentPhoneEncrypted, ...safeDoc } =
                doc;

            let phone = null;
            let appointmentPhone = null;

            try {
                phone = phoneEncrypted ? decrypt(phoneEncrypted) : null;
                appointmentPhone = appointmentPhoneEncrypted
                    ? decrypt(appointmentPhoneEncrypted)
                    : null;
            } catch (err) {
                console.error("Decrypt error:", err);
            }

            // safeDoc contains everything EXCEPT the two encrypted fields.
            // phone and appointmentPhone are the decrypted values only.
            return {
                ...safeDoc,
                phone,
                appointmentPhone,
            };
        });

        return res.json({ success: true, doctors });
    } catch (err) {
        console.error("DOCTORS ERROR:", err);
        return res.status(500).json({ success: false, error: "Server error" });
    }
});

module.exports = router;
