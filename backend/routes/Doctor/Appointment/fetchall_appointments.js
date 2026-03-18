const express = require("express");
const router = express.Router();
const Appointment = require("../../../models/Appointment");
var fetchuser = require("../../../middleware/fetchuser");

router.get("/fetchall_appointments", fetchuser, async (req, res) => {
    try {
        const {
            limit = 20,
            skip = 0,
            search = "",
            gender,
            payments,
            status,
            services,
            startDate,
            endDate,
        } = req.query;

        const parsedLimit = parseInt(limit) || 20;
        const parsedSkip = parseInt(skip) || 0;

        const doctorId =
            req.user.role === "doctor" ? req.user.id : req.user.doctorId;

        const appointments = await Appointment.find({
            doctor: doctorId,
        }).populate("patient");

        let allVisits = [];

        appointments.forEach((appt) => {
            if (!appt.patient) return;

            appt.visits.forEach((visit) => {
                const amount = Number(visit.amount) || 0;
                const collected =
                    visit.collected !== undefined
                        ? Number(visit.collected)
                        : amount;

                const remaining =
                    visit.remaining !== undefined
                        ? Number(visit.remaining)
                        : Math.max(amount - collected, 0);

                const visitStatus =
                    visit.status ||
                    (remaining === 0
                        ? "Paid"
                        : collected > 0
                          ? "Partial"
                          : "Unpaid");

                allVisits.push({
                    patientId: appt.patient._id,
                    name: appt.patient.name || "",
                    number: appt.patient.number || "",
                    gender: appt.patient.gender || "",
                    date: visit.date,
                    time: visit.time,
                    payment_type: visit.payment_type,
                    amount,
                    collected,
                    remaining,
                    status: visitStatus,
                    services: visit.service || [],
                    invoiceNumber: visit.invoiceNumber || "",
                });
            });
        });

        // ================= FILTERS =================

        allVisits = allVisits.filter((v) => {
            const searchMatch =
                !search ||
                v.name.toLowerCase().includes(search.toLowerCase()) ||
                v.number.includes(search);

            const genderMatch = !gender || v.gender === gender;

            const paymentMatch =
                !payments || payments.split(",").includes(v.payment_type);

            const statusMatch = !status || status.split(",").includes(v.status);

            const serviceMatch =
                !services ||
                (v.services || []).some((s) =>
                    services
                        .split(",")
                        .includes(typeof s === "object" ? s.name : s),
                );

            const dateObj = new Date(v.date);

            const startMatch = !startDate || dateObj >= new Date(startDate);

            const end = endDate ? new Date(endDate) : null;
            if (end) end.setHours(23, 59, 59, 999);

            const endMatch = !end || dateObj <= end;

            return (
                searchMatch &&
                genderMatch &&
                paymentMatch &&
                statusMatch &&
                serviceMatch &&
                startMatch &&
                endMatch
            );
        });

        // ================= SORT =================

        allVisits.sort((a, b) => {
            const d1 = new Date(a.date);
            const d2 = new Date(b.date);

            if (a.time) {
                const [h, m] = a.time.split(":").map(Number);
                d1.setHours(h, m, 0, 0);
            }

            if (b.time) {
                const [h, m] = b.time.split(":").map(Number);
                d2.setHours(h, m, 0, 0);
            }

            return d2 - d1; 
        });

        const total = allVisits.length;

        const paginatedVisits = allVisits.slice(
            parsedSkip,
            parsedSkip + parsedLimit,
        );

        res.json({
            success: true,
            total,
            data: paginatedVisits,
        });
    } catch (err) {
        console.error("fetchallappointments error:", err);
        res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

module.exports = router;
