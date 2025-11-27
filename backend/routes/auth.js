const express = require("express");
const router = express.Router();
const Doc = require("../models/Doc");
const Patient = require("../models/Patient");
const Service = require("../models/Service");
const Appointment = require("../models/Appointment");
const Counter = require("../models/Counter");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
var fetchuser = require("../middleware/fetchuser");
const JWT_SECRET = process.env.JWT_SECRET;
const authMiddleware = require("../middleware/fetchuser"); // if using auth

//CREATE A Doctor USING : POST "/API/AUTH" Doesn't require auth
router.post(
    "/createdoc",
    [
        body("name").isLength({ min: 3 }),
        body("email").isEmail(),
        body("password").isLength({ min: 5 }),
        body("clinicName").notEmpty(),
        body("phone").isLength({ min: 10 }),
        body("address.line1").notEmpty(),
        body("address.city").notEmpty(),
        body("address.state").notEmpty(),
        body("address.pincode").isLength({ min: 4 }),
        body("experience").notEmpty(),
        // body("timings").isArray(),
        body("degree").isArray(),
    ],
    async (req, res) => {
        let success = false;
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success, errors: errors.array() });
        }

        try {
            let doc = await Doc.findOne({ email: req.body.email });
            if (doc) {
                return res
                    .status(400)
                    .json({ success: false, error: "Doctor already exists" });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(req.body.password, salt);
            let degrees = Array.isArray(req.body.degree)
                ? req.body.degree
                : [req.body.degree];
            // Create doctor
            doc = await Doc.create({
                name: req.body.name,
                email: req.body.email,
                password: hashedPassword,
                clinicName: req.body.clinicName,
                phone: req.body.phone,
                appointmentPhone: req.body.appointmentPhone || "",
                address: req.body.address,
                gstNumber: req.body.gstNumber || "",
                experience: req.body.experience,
                // timings: req.body.timings.map((t) => ({
                //     day: t.day,
                //     slots: t.slots || [],
                //     note: t.note || "",
                // })),
                degree: req.body.degree,
            });

            const payload = { doc: { id: doc.id } };
            const authtoken = jwt.sign(payload, JWT_SECRET);

            success = true;
            res.json({ success, authtoken });
        } catch (error) {
            console.error(error.message);
            res.status(500).json({
                success: false,
                error: "Internal server error",
            });
        }
    }
);

// Creating a Patient using : POST "/API/AUTH" Doesn't require auth
// Add fetchuser middleware to get logged-in doctor
router.post(
    "/addpatient",
    fetchuser,
    [
        body("name", "Enter Name").notEmpty(),
        body("service"),
        body("number"),
        body("amount"),
        body("age")
            .optional({ checkFalsy: true })
            .isNumeric()
            .withMessage("Age must be a number"),
    ],
    async (req, res) => {
        let success = false;
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success, errors: errors.array() });
        }

        try {
            const doctorId = req.doc.id; // fetched from JWT
            const patient = await Patient.create({
                name: req.body.name,
                service: req.body.service,
                number: req.body.number,
                amount: req.body.amount,
                age: req.body.age,
                doctor: doctorId,
            });

            success = true;
            res.json({ success, patient });
        } catch (err) {
            console.error("AddPatient error:", err); // full error object with stack
            res.status(500).json({
                success,
                error: err.message, // send actual reason back to frontend
            });
        }
    }
);

//Creating a Service using : POST "/API/AUTH" Doesn't require auth

router.post(
    "/createservice",
    fetchuser,
    [body("name").notEmpty(), body("amount").isNumeric()],
    async (req, res) => {
        try {
            // 🔑 Use req.doc.id (from fetchuser), not req.doc
            const existingService = await Service.findOne({
                name: req.body.name,
                doctor: req.doc.id, // consistent with schema
            });

            if (existingService) {
                return res.status(400).json({
                    success: false,
                    error: "Service already exists for this doctor",
                });
            }

            const service = await Service.create({
                name: req.body.name,
                amount: req.body.amount,
                doctor: req.doc.id, // consistent with schema
            });

            res.status(200).json({
                success: true,
                status: "Added successfully",
                service,
            });
        } catch (error) {
            console.error(error.message);
            res.status(500).json({
                success: false,
                error: "Internal server error",
            });
        }
    }
);

// Fetch all services for the logged-in doctor
router.get("/fetchallservice", fetchuser, async (req, res) => {
    try {
        const services = await Service.find({ doctor: req.doc.id });
        res.json(services);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: "Server error" });
    }
});

// Update a service
router.put("/updateservice/:id", async (req, res) => {
    try {
        const { name, amount } = req.body;
        const service = await Service.findById(req.params.id);

        if (!service) {
            return res.status(404).json({ error: "Service not found" });
        }

        service.name = name || service.name;
        service.amount = amount || service.amount;

        await service.save();
        res.json({ success: true, service });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

//fetch all patients

router.get("/fetchallpatients", fetchuser, async (req, res) => {
    try {
        const patients = await Patient.find({ doctor: req.doc.id });

        const patientsWithLast = await Promise.all(
            patients.map(async (p) => {
                const appointment = await Appointment.findOne({
                    patient: p._id,
                });
                let lastDate = null;
                let lastpayment_type = null;

                if (appointment && appointment.visits.length > 0) {
                    const lastVisit =
                        appointment.visits[appointment.visits.length - 1];
                    lastDate = lastVisit.date;
                    lastpayment_type = lastVisit.payment_type; // <-- add this
                }

                return {
                    ...p.toObject(),
                    lastAppointment: lastDate,
                    lastpayment_type, // <-- return it
                };
            })
        );

        res.json(patientsWithLast);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});

//

router.get("/fetchpatientsbylastvisit", async (req, res) => {
    try {
        const patients = await Patient.find();

        // Attach latest visit date per patient
        const patientsWithVisit = await Promise.all(
            patients.map(async (p) => {
                const appointment = await Appointment.findOne({
                    patient: p._id,
                });
                let lastDate = null;
                if (appointment && appointment.visits.length > 0) {
                    lastDate =
                        appointment.visits[appointment.visits.length - 1].date;
                }
                return {
                    ...p.toObject(),
                    lastAppointment: lastDate,
                };
            })
        );

        // Group patients by lastAppointment date
        const grouped = {};
        patientsWithVisit.forEach((p) => {
            const dateKey = p.lastAppointment
                ? new Date(p.lastAppointment).toISOString().slice(0, 10) // YYYY-MM-DD
                : "No Visits";

            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(p);
        });

        res.json(grouped);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});

//update patient details

router.put(
    "/updatepatientdetails/:id",
    [
        body("name", "Enter Name").notEmpty(),
        body("service").optional(),
        body("number").optional(),
        body("amount").optional(),
        body("age")
            .optional({ checkFalsy: true }) // allows empty string or missing field
            .isNumeric()
            .withMessage("Age must be a number"),
    ],
    async (req, res) => {
        try {
            // Check validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            // Build update object
            const { name, service, number, amount, age } = req.body;
            const updateFields = {};
            if (name) updateFields.name = name;
            if (service) updateFields.service = service;
            if (number) updateFields.number = number;
            if (amount) updateFields.amount = amount;
            if (age) updateFields.age = age;

            // Update patient
            const patient = await Patient.findByIdAndUpdate(
                req.params.id,
                { $set: updateFields },
                { new: true } // return updated document
            );

            if (!patient) {
                return res.status(404).json({ message: "Patient not found" });
            }

            res.status(200).json({
                success: true,
                status: "Updated successfully",
                patient,
            });
        } catch (err) {
            console.error(err.message);
            res.status(500).json({ message: "Server error" });
        }
    }
);

// delete patient by id
router.delete("/deletepatient/:id", authMiddleware, async (req, res) => {
    try {
        const patientId = req.params.id;

        // Check if patient exists
        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res
                .status(404)
                .json({ success: false, message: "Patient not found" });
        }

        // Delete patient
        await Patient.findByIdAndDelete(patientId);

        // (Optional) also delete related appointments if needed
        await Appointment.deleteMany({ patientId: patientId });

        res.json({ success: true, message: "Patient deleted successfully" });
    } catch (err) {
        console.error("Error deleting patient:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

router.post("/addappointment/:id", async (req, res) => {
    try {
        const { service, amount, payment_type, doctorId, date } = req.body;
        const patientId = req.params.id;

        if (!service || !Array.isArray(service)) {
            return res.status(400).json({ message: "Service must be an array" });
        }
        if (amount == null) {
            return res.status(400).json({ message: "Amount is required" });
        }

        // Determine doctor ID
        let finalDoctorId = doctorId;
        if (!finalDoctorId) {
            const patient = await Patient.findById(patientId);
            if (!patient)
                return res.status(404).json({ message: "Patient not found" });
            if (!patient.doctor)
                return res.status(400).json({ message: "Doctor ID is required" });
            finalDoctorId = patient.doctor;
        }

        // Generate per-doctor invoice number
        const counterId = `invoice_${finalDoctorId}`;
        const counter = await Counter.findByIdAndUpdate(
            counterId,
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        const invoiceNumber = counter.seq;

        const appointment = await Appointment.addVisit(
            patientId,
            finalDoctorId,
            service,
            amount,
            payment_type,
            invoiceNumber,
            date
        );

        res.status(201).json({
            success: true,
            message: "Appointment added successfully",
            appointment,
        });
    } catch (err) {
        console.error("Add Appointment Error:", err);
        res.status(500).json({ message: "Server error" });
    }
});


// GET /api/auth/patientdetails/:id
router.get("/patientdetails/:id", async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ message: "Patient not found" });
        }
        res.json(patient);
    } catch (err) {
        res.status(500).json({
            message: "Error fetching patient",
            error: err.message,
        });
    }
});

// PUT /api/auth/updateappointment/:appointmentId
router.put(
    "/updateappointment/:appointmentId/:visitId",
    authMiddleware,
    async (req, res) => {
        const { appointmentId, visitId } = req.params;
        const { date, service, amount, payment_type } = req.body;

        if (
            !date ||
            !service ||
            !Array.isArray(service) ||
            service.length === 0
        ) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid data" });
        }

        try {
            const appointment = await Appointment.findById(appointmentId);
            if (!appointment) {
                return res
                    .status(404)
                    .json({ success: false, message: "Appointment not found" });
            }

            const visit = appointment.visits.id(visitId);
            if (!visit) {
                return res
                    .status(404)
                    .json({ success: false, message: "Visit not found" });
            }

            // Update fields
            visit.date = new Date(date);
            visit.service = service.map((s) => ({
                id: s.id || null,
                name: s.name,
                amount: s.amount || 0,
            }));
            visit.amount =
                amount ||
                visit.service.reduce((sum, s) => sum + (s.amount || 0), 0);

            // ✅ Handle payment_type safely
            if (
                payment_type &&
                ["Cash", "Card", "UPI", "Other"].includes(payment_type)
            ) {
                visit.payment_type = payment_type;
            }

            await appointment.save();

            res.json({ success: true, visit });
        } catch (err) {
            console.error("Error updating visit:", err); // ✅ full error log
            res.status(500).json({
                success: false,
                message: err.message || "Server error",
            });
        }
    }
);

// router.post("/addappointment/:id", async (req, res) => {
//     try {
//         const { service, amount, payment_type } = req.body;
//         const patientId = req.params.id;

//         if (!service || !Array.isArray(service)) {
//             return res
//                 .status(400)
//                 .json({ message: "Service must be an array" });
//         }

//         if (amount == null) {
//             return res.status(400).json({ message: "Amount is required" });
//         }

//         const appointment = await Appointment.addVisit(
//             patientId,
//             service,
//             amount,
//             payment_type
//         );

//         res.status(201).json({
//             success: true,
//             message: "Appointment added successfully",
//             appointment,
//         });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: "Server error" });
//     }
// });

router.get("/appointments/:patientId", async (req, res) => {
    try {
        const appointments = await Appointment.find({
            patient: req.params.patientId,
        });
        res.json(appointments);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

router.post(
    "/login",
    [body("email").isEmail(), body("password", "Enter password").exists()],
    async (req, res) => {
        let success = false;
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success, errors: errors.array() });
        }

        const { email, password } = req.body;

        try {
            const doc = await Doc.findOne({ email });
            if (!doc) {
                return res
                    .status(400)
                    .json({ success, error: "Invalid credentials" });
            }

            const passwordCompare = await bcrypt.compare(
                password,
                doc.password
            );
            if (!passwordCompare) {
                return res
                    .status(400)
                    .json({ success, error: "Invalid credentials" });
            }

            const payload = { doc: { id: doc.id } };
            const authtoken = jwt.sign(payload, JWT_SECRET);

            success = true;
            res.json({
                success,
                authtoken,
                name: doc.name,
                email: doc.email,
            });
        } catch (error) {
            console.error(error.message);
            res.status(500).send("Internal server error");
        }
    }
);
router.get("/getdoc", fetchuser, async (req, res) => {
    try {
        const doc = await Doc.findById(req.doc.id).select("-password");
        if (!doc) {
            return res
                .status(404)
                .json({ success: false, error: "Doctor not found" });
        }
        res.json({ success: true, doctor: doc });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
});

// router.get("/fetch-all-visits", fetchuser, async (req, res) => {
//     try {
//         const appointments = await Appointment.find({ doctor: req.doc.id })
//             .populate("patient", "name number")
//             .populate("doctor", "name");

//         const allVisits = appointments.flatMap((a) =>
//             a.visits.map((v) => ({
//                 appointmentId: a._id,
//                 patientName: a.patient?.name || "Unknown",
//                 number: a.patient?.number || "N/A",
//                 doctorName: a.doctor?.name || "Unknown",
//                 date: v.date,
//                 paymentType: v.payment_type,
//                 invoiceNumber: v.invoiceNumber,
//                 amount: v.amount,
//             }))
//         );

//         allVisits.sort((a, b) => new Date(b.date) - new Date(a.date));

//         res.status(200).json(allVisits);
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: "Server error" });
//     }
// });

module.exports = router;
