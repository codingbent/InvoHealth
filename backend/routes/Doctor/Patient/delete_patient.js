const express = require("express");
const router = express.Router();
const Patient = require("../../../models/Patient");
const Appointment = require("../../../models/Appointment");
const authMiddleware = require("../../../middleware/fetchuser");

router.delete("/delete_patient/:id", authMiddleware, async (req, res) => {
    try {
        const patientId = req.params.id;

        const patient = await Patient.findById(patientId);
        if (!patient)
            return res
                .status(404)
                .json({ success: false, message: "Patient not found" });

        // Clean appointments before delete
        const appointments = await Appointment.find({ patient: patientId });

        for (let a of appointments) {
            a.visits = a.visits.filter((v) => {
                const isEmptyVisit =
                    (!v.service || v.service.length === 0) &&
                    (!v.amount || v.amount === 0);
                return !isEmptyVisit;
            });

            if (a.visits.length === 0) {
                await Appointment.findByIdAndDelete(a._id);
            } else {
                await a.save();
            }
        }

        // Now delete patient safely
        await Patient.findByIdAndDelete(patientId);

        res.json({
            success: true,
            message: "Patient and related appointments deleted",
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

module.exports = router;
