const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Doc = require("../models/Doc");
const Patient = require("../models/Patient");
const Service = require("../models/Service");
const Appointment = require("../models/Appointment");
const Counter = require("../models/Counter");
const Staff = require("../models/Staff");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
var fetchuser = require("../middleware/fetchuser");
const JWT_SECRET = process.env.JWT_SECRET;
const authMiddleware = require("../middleware/fetchuser"); // if using auth
const axios = require("axios");

const TWO_FACTOR_API_KEY = process.env.TWO_FACTOR_API_KEY;
const isValidIndianMobile = (phone) => /^[6-9]\d{9}$/.test(phone);

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
            let doc = await Doc.findOne({
                $or: [{ email: req.body.email }, { phone: req.body.phone }],
            });

            if (doc) {
                return res.status(400).json({
                    success: false,
                    error: "Email or phone already registered",
                });
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
                regNumber: req.body.regNumber || "",
                experience: req.body.experience,
                // timings: req.body.timings.map((t) => ({
                //     day: t.day,
                //     slots: t.slots || [],
                //     note: t.note || "",
                // })),
                degree: degrees,
                role: "doctor",
            });

            const payload = {
                user: {
                    id: doc._id,
                    role: "doctor",
                    doctorId: doc._id,
                },
            };

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

router.post("/login", async (req, res) => {
    const { identifier, password, loginType, identifierType } = req.body;

    try {
        let user = null;
        let userRole = null;

        // ======================
        // 1️⃣ DOCTOR FIRST
        // ======================
        if (identifierType === "email") {
            user = await Doc.findOne({ email: identifier });
            if (user) userRole = "doctor";
        }

        if (!user && identifierType === "phone") {
            user = await Doc.findOne({ phone: identifier });
            if (user) userRole = "doctor";
        }

        // ======================
        // 2️⃣ IF NOT DOCTOR then STAFF
        // ======================
        if (!user && identifierType === "phone") {
            user = await Staff.findOne({ phone: identifier, isActive: true });
            if (user) userRole = user.role;
        }

        if (!user) {
            return res.status(400).json({ error: "Invalid credentials" });
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(400).json({ error: "Invalid credentials" });
        }

        // ======================
        // 3️⃣ JWT
        // ======================
        const payload = {
            user: {
                id: user._id,
                role: userRole,
                doctorId: userRole === "doctor" ? user._id : user.doctorId,
            },
        };

        const authtoken = jwt.sign(payload, JWT_SECRET, {
            expiresIn: "7d",
        });

        res.json({
            success: true,
            authtoken,
            role: userRole,
            name: user.name,
            doctorId: userRole === "doctor" ? user._id : user.doctorId,
            theme:user.theme||"light",
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
});

router.post(
    "/addpatient",
    fetchuser,
    [
        body("name", "Enter Name").notEmpty(),
        body("number").isLength({ min: 10, max: 10 }),
        body("age")
            .optional({ checkFalsy: true })
            .isNumeric()
            .withMessage("Age must be a number"),
        body("gender")
            .optional()
            .isIn(["Male", "Female"])
            .withMessage("Gender must be Male or Female"),
    ],
    async (req, res) => {
        try {
            const doctorId = req.user.doctorId;
            const { name, number, age, gender } = req.body;

            // 🔍 CHECK EXISTING PATIENT (NAME + NUMBER)
            const existingPatient = await Patient.findOne({
                doctor: doctorId,
                name: { $regex: `^${name.trim()}$`, $options: "i" },
                number: number.trim(),
            });

            if (existingPatient) {
                return res.json({
                    success: true,
                    patient: existingPatient,
                    alreadyExists: true,
                });
            }

            // ✅ CREATE NEW PATIENT
            const patient = await Patient.create({
                name: name.trim(),
                number: number.trim(),
                age,
                gender,
                doctor: doctorId,
            });

            res.json({
                success: true,
                patient,
                alreadyExists: false,
            });
        } catch (err) {
            // 🔥 DUPLICATE PATIENT
            if (err.code === 11000) {
                return res.status(409).json({
                    success: false,
                    error: "Patient with same name and number already exists",
                    alreadyExists: true,
                });
            }

            console.error("AddPatient error:", err);
            return res.status(500).json({
                success: false,
                error: "Server error",
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
                doctor: req.user.doctorId, // consistent with schema
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
                doctor: req.user.doctorId, // consistent with schema
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
        // 🔑 Resolve doctorId from token
        const doctorId =
            req.user.role === "doctor" ? req.user.id : req.user.doctorId;

        const services = await Service.find({ doctor: doctorId });

        res.json({
            success: true,
            services,
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            success: false,
            error: "Server error",
        });
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

//update patient details

router.put(
    "/updatepatientdetails/:id",
    [
        body("name", "Enter Name").notEmpty(),
        body("service").optional(),
        body("number").optional(),
        body("amount").optional(),
        body("age")
            .optional({ checkFalsy: true })
            .isNumeric()
            .withMessage("Age must be a number"),

        // 👉 Gender field validation
        body("gender")
            .optional()
            .isIn(["Male", "Female"])
            .withMessage("Gender must be Male, Female"),
    ],
    async (req, res) => {
        try {
            // Check validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            // Extract fields
            const { name, service, number, amount, age, gender } = req.body;

            // Build update object dynamically
            const updateFields = {};
            if (name) updateFields.name = name;
            if (service) updateFields.service = service;
            if (number) updateFields.number = number;
            if (amount) updateFields.amount = amount;
            if (age) updateFields.age = age;

            // 👉 Add gender
            if (gender) updateFields.gender = gender;

            // Update patient
            const patient = await Patient.findByIdAndUpdate(
                req.params.id,
                { $set: updateFields },
                { new: true }
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

router.post("/addappointment/:id", async (req, res) => {
    try {
        const {
            service,
            amount,
            payment_type,
            doctorId,
            date,
            discount,
            isPercent,
        } = req.body;

        const patientId = req.params.id;

        // --------------------------------------------------
        // 1. VALIDATION
        // --------------------------------------------------
        if (!Array.isArray(service) || service.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Service must be a non-empty array",
            });
        }

        // --------------------------------------------------
        // 2. FIND PATIENT
        // --------------------------------------------------
        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found",
            });
        }

        // --------------------------------------------------
        // 3. DETERMINE DOCTOR
        // --------------------------------------------------
        const finalDoctorId = doctorId || patient.doctor;
        if (!finalDoctorId) {
            return res.status(400).json({
                success: false,
                message: "Doctor ID missing",
            });
        }

        // --------------------------------------------------
        // 4. SERVICE TOTAL (SERVER AUTHORITATIVE)
        // --------------------------------------------------
        const serviceTotal = service.reduce(
            (sum, s) => sum + (Number(s.amount) || 0),
            0
        );

        // --------------------------------------------------
        // 5. DISCOUNT
        // --------------------------------------------------
        const disc = Number(discount) || 0;
        const percentFlag = Boolean(isPercent);

        let discountValue = 0;
        if (disc > 0) {
            discountValue = percentFlag ? serviceTotal * (disc / 100) : disc;
        }

        if (discountValue > serviceTotal) discountValue = serviceTotal;
        if (discountValue < 0) discountValue = 0;

        // --------------------------------------------------
        // 6. FINAL AMOUNT
        // --------------------------------------------------
        const finalAmount = serviceTotal - discountValue;

        // --------------------------------------------------
        // 7. INVOICE NUMBER (PER DOCTOR)
        // --------------------------------------------------
        const counterId = `invoice_${finalDoctorId}`;
        const counter = await Counter.findByIdAndUpdate(
            counterId,
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );

        const invoiceNumber = counter.seq;

        // --------------------------------------------------
        // 8. VISIT OBJECT
        // --------------------------------------------------
        const visitDate = date ? new Date(date) : new Date();

        const visitData = {
            service: service.map((s) => ({
                id: s.id || null,
                name: s.name,
                amount: Number(s.amount) || 0,
            })),
            amount: finalAmount,
            payment_type,
            invoiceNumber,
            date: visitDate,
            discount: disc,
            isPercent: percentFlag,
        };

        // --------------------------------------------------
        // 9. SAVE VISIT
        // --------------------------------------------------
        const appointment = await Appointment.findOneAndUpdate(
            { patient: patientId },
            {
                $push: { visits: visitData },
                $set: { doctor: finalDoctorId },
            },
            { new: true, upsert: true }
        );

        // --------------------------------------------------
        // 🔥 10. FIX: UPDATE lastAppointment SAFELY
        // --------------------------------------------------
        const currentLast = patient.lastAppointment
            ? new Date(patient.lastAppointment)
            : null;

        if (!currentLast || visitDate > currentLast) {
            patient.lastAppointment = visitDate;
            patient.lastpayment_type = payment_type;
            await patient.save();
        }
        // --------------------------------------------------

        return res.status(201).json({
            success: true,
            message: "Appointment added successfully",
            appointment,
        });
    } catch (err) {
        console.error("Add Appointment Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message,
        });
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
        try {
            const { appointmentId, visitId } = req.params;
            const { date, service, payment_type, discount, isPercent } =
                req.body;

            // 1. Basic validation
            if (
                !date ||
                !service ||
                !Array.isArray(service) ||
                service.length === 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid data. Missing date or services.",
                });
            }

            // 2. Fetch appointment
            const appointment = await Appointment.findById(appointmentId);
            if (!appointment) {
                return res
                    .status(404)
                    .json({ success: false, message: "Appointment not found" });
            }

            // 3. Find correct visit
            const visit = appointment.visits.id(visitId);
            if (!visit) {
                return res
                    .status(404)
                    .json({ success: false, message: "Visit not found" });
            }

            // 4. Update visit date
            visit.date = new Date(date);

            // 5. Update service list (normalize)
            visit.service = service.map((s) => ({
                id: s.id || null,
                name: s.name,
                amount: Number(s.amount) || 0,
            }));

            // 6. Compute service total
            const serviceTotal = visit.service.reduce(
                (sum, s) => sum + (Number(s.amount) || 0),
                0
            );

            // 7. Compute discount
            const disc = Number(discount) || 0;
            const percentFlag = Boolean(isPercent);

            let discountValue = 0;

            if (disc > 0) {
                if (percentFlag) {
                    discountValue = serviceTotal * (disc / 100);
                } else {
                    discountValue = disc;
                }
            }

            if (discountValue < 0) discountValue = 0;
            if (discountValue > serviceTotal) discountValue = serviceTotal;

            // 8. Final payable amount
            const finalAmount = serviceTotal - discountValue;

            // 9. Update payment type (validated)
            if (
                payment_type &&
                ["Cash", "Card", "UPI", "ICICI", "HDFC", "Other"].includes(
                    payment_type
                )
            ) {
                visit.payment_type = payment_type;
            }

            // 10. Save computed values
            visit.amount = finalAmount;
            visit.discount = disc;
            visit.isPercent = percentFlag;

            // 11. Save appointment
            await appointment.save();

            return res.json({
                success: true,
                message: "Appointment updated successfully",
                visit,
            });
        } catch (err) {
            console.error("Error updating appointment:", err);
            return res.status(500).json({
                success: false,
                message: err.message || "Server error",
            });
        }
    }
);

router.get("/appointments/:patientId", fetchuser, async (req, res) => {
    try {
        const appointment = await Appointment.findOne({
            patient: req.params.patientId,
        }).lean();

        if (!appointment) {
            return res.json({
                appointmentId: null,
                visits: [],
            });
        }

        // sort visits latest first
        appointment.visits.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json({
            appointmentId: appointment._id,
            visits: appointment.visits,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

router.get("/getdoc", fetchuser, async (req, res) => {
    try {
        // 🔑 doctorId works for BOTH doctor & staff
        const doctorId =
            req.user.role === "doctor" ? req.user.id : req.user.doctorId;

        const doc = await Doc.findById(doctorId).select("-password");

        if (!doc) {
            return res.status(404).json({
                success: false,
                error: "Doctor not found",
            });
        }
        res.json({ success: true, doctor: doc });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
});

router.put("/updatedoc", fetchuser, async (req, res) => {
    try {
        const updated = await Doc.findByIdAndUpdate(
            req.user.doctorId,
            { $set: req.body },
            { new: true }
        );

        return res.json({ success: true, doctor: updated });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

router.put(
    "/edit-invoice/:appointmentId/:visitId",
    fetchuser,
    async (req, res) => {
        try {
            const { appointmentId, visitId } = req.params;
            const { date, service, payment_type, discount, isPercent } =
                req.body;

            // 1️⃣ Validation
            if (!date || !Array.isArray(service) || service.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Date and at least one service are required",
                });
            }

            // 2️⃣ Find appointment
            const appointment = await Appointment.findById(appointmentId);
            if (!appointment) {
                return res.status(404).json({
                    success: false,
                    message: "Appointment not found",
                });
            }

            // 3️⃣ Find visit inside appointment
            const visit = appointment.visits.id(visitId);
            if (!visit) {
                return res.status(404).json({
                    success: false,
                    message: "Visit not found",
                });
            }

            // 4️⃣ Update date
            const visitDate = new Date(date);
            visit.date = visitDate;

            // 5️⃣ Normalize services
            visit.service = service.map((s) => ({
                id: s.id || null,
                name: s.name,
                amount: Number(s.amount) || 0,
            }));

            // 6️⃣ Compute service total
            const serviceTotal = visit.service.reduce(
                (sum, s) => sum + s.amount,
                0
            );

            // 7️⃣ Discount calculation
            const disc = Number(discount) || 0;
            const percentFlag = Boolean(isPercent);

            let discountValue = 0;
            if (disc > 0) {
                discountValue = percentFlag
                    ? serviceTotal * (disc / 100)
                    : disc;
            }

            if (discountValue > serviceTotal) discountValue = serviceTotal;
            if (discountValue < 0) discountValue = 0;

            // 8️⃣ Final amount
            const finalAmount = serviceTotal - discountValue;

            // 9️⃣ Payment type validation
            if (
                payment_type &&
                ["Cash", "Card", "UPI", "ICICI", "HDFC", "Other"].includes(
                    payment_type
                )
            ) {
                visit.payment_type = payment_type;
            }

            // 🔟 Save computed values
            visit.amount = finalAmount;
            visit.discount = disc;
            visit.isPercent = percentFlag;

            // 1️⃣1️⃣ Save appointment
            await appointment.save();

            return res.json({
                success: true,
                message: "Invoice updated successfully",
                visit,
            });
        } catch (err) {
            console.error("Edit invoice error:", err);
            res.status(500).json({
                success: false,
                message: "Server error",
            });
        }
    }
);
router.delete(
    "/delete-invoice/:appointmentId/:visitId",
    fetchuser,
    async (req, res) => {
        try {
            const { appointmentId, visitId } = req.params;

            const appointment = await Appointment.findById(appointmentId);
            if (!appointment)
                return res
                    .status(404)
                    .json({ message: "Appointment not found" });

            // Remove visit
            appointment.visits = appointment.visits.filter(
                (v) => v._id.toString() !== visitId
            );

            // 🛑 NEW FIX: Also remove broken/empty visits
            appointment.visits = appointment.visits.filter((v) => {
                const isEmptyVisit =
                    (!v.service || v.service.length === 0) &&
                    (!v.amount || v.amount === 0);

                return !isEmptyVisit;
            });

            // If no visits left → delete appointment
            if (appointment.visits.length === 0) {
                await Appointment.findByIdAndDelete(appointmentId);
                return res.json({
                    success: true,
                    message:
                        "Visit deleted — appointment removed (no visits left)",
                });
            }

            await appointment.save();
            res.json({ success: true, message: "Visit deleted" });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Server error" });
        }
    }
);

router.get("/fetchallappointments", fetchuser, async (req, res) => {
    try {
        const {
            limit = 10,
            skip = 0,
            search = "",
            gender,
            payments,
            services,
            startDate,
            endDate,
        } = req.query;

        const parsedLimit = parseInt(limit) || 10;
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
                allVisits.push({
                    patientId: appt.patient._id,
                    name: appt.patient.name || "",
                    number: appt.patient.number || "",
                    gender: appt.patient.gender || "",
                    date: visit.date,
                    payment_type: visit.payment_type,
                    amount: visit.amount,
                    services: visit.service || [],
                    invoiceNumber: visit.invoiceNumber || "",
                });
            });
        });

        // FILTERS
        allVisits = allVisits.filter((v) => {
            const searchMatch =
                !search ||
                v.name.toLowerCase().includes(search.toLowerCase()) ||
                v.number.includes(search);

            const genderMatch = !gender || v.gender === gender;

            const paymentMatch =
                !payments || payments.split(",").includes(v.payment_type);

            const serviceMatch =
                !services ||
                (v.services || []).some((s) =>
                    services
                        .split(",")
                        .includes(typeof s === "object" ? s.name : s)
                );

            const dateObj = new Date(v.date);
            const startMatch = !startDate || dateObj >= new Date(startDate);
            const endMatch = !endDate || dateObj <= new Date(endDate);

            return (
                searchMatch &&
                genderMatch &&
                paymentMatch &&
                serviceMatch &&
                startMatch &&
                endMatch
            );
        });

        // SORT
        allVisits.sort((a, b) => new Date(b.date) - new Date(a.date));

        const total = allVisits.length;

        // ✅ CORRECT PAGINATION
        const paginatedVisits = allVisits.slice(
            parsedSkip,
            parsedSkip + parsedLimit
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

router.get("/exportappointments", fetchuser, async (req, res) => {
    try {
        const appointments = await Appointment.find({
            doctor: req.user.doctorId,
        }).populate("patient");

        const allVisits = [];

        appointments.forEach((appt) => {
            if (!appt.patient) return;

            appt.visits.forEach((visit) => {
                allVisits.push({
                    patientId: appt.patient._id,
                    name: appt.patient.name,
                    number: appt.patient.number || "",
                    gender: appt.patient.gender || "",
                    date: visit.date,
                    payment_type: visit.payment_type,
                    amount: visit.amount,
                    services: visit.service || [],
                    invoiceNumber: visit.invoiceNumber || "",
                });
            });
        });

        allVisits.sort((a, b) => new Date(a.date) - new Date(b.date)); // ASC for excel

        res.json(allVisits);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// GET /api/auth/search-patients?q=rahul
router.get("/search-patients", fetchuser, async (req, res) => {
    try {
        const q = req.query.q?.trim();

        if (!q) {
            return res.json([]);
        }

        const patients = await Patient.find({
            doctor: req.user.doctorId,
            $or: [
                { name: { $regex: q, $options: "i" } },
                { number: { $regex: q } },
            ],
        })
            .limit(10) // 🔥 IMPORTANT: limit results
            .select("name number gender age");

        res.json(patients);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

router.post("/send-otp", async (req, res) => {
    const phone = req.body.phone;

    if (!/^[6-9]\d{9}$/.test(phone)) {
        return res.status(400).json({
            success: false,
            error: "Invalid mobile number",
        });
    }

    try {
        const response = await axios.get(
            `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/${phone}/AUTOGEN`
        );

        console.log("2Factor Response:", response.data);

        if (response.data.Status === "Success") {
            return res.json({
                success: true,
                sessionId: response.data.Details,
            });
        }

        return res.status(400).json({
            success: false,
            error: response.data.Details || "OTP could not be sent",
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({
            success: false,
            error: "OTP service unavailable",
        });
    }
});

router.post("/check-phone", async (req, res) => {
    const phone = String(req.body.phone || "").replace(/\D/g, "");

    if (!/^[6-9]\d{9}$/.test(phone)) {
        return res.status(400).json({
            success: false,
            error: "Invalid mobile number",
        });
    }

    try {
        const existingUser = await Doc.findOne({ phone });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: "Phone number already registered",
            });
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

router.post("/verify-otp", async (req, res) => {
    let { sessionId, otp, phone } = req.body;

    // ✅ normalize phone
    phone = phone.replace(/\D/g, "").slice(-10);

    try {
        const response = await axios.get(
            `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/VERIFY/${sessionId}/${otp}`
        );

        if (response.data.Status !== "Success") {
            return res.status(400).json({
                success: false,
                error: "Invalid OTP",
            });
        }

        // 🔍 Check user in DB
        const doc = await Doc.findOne({ phone });

        if (!doc) {
            return res.status(400).json({
                success: false,
                error: "User not registered",
            });
        }

        const payload = {
            user: {
                id: doc._id,
                role: "doctor",
                doctorId: doc._id,
            },
        };

        const authtoken = jwt.sign(payload, JWT_SECRET);

        res.json({
            success: true,
            authtoken,
            name: doc.name,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: "OTP verification failed",
        });
    }
});

router.put("/change-password", fetchuser, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: "Missing fields",
            });
        }

        const doc = await Doc.findById(req.user.doctorId);

        if (!doc) {
            return res.status(404).json({
                success: false,
                error: "Doctor not found",
            });
        }

        // ✅ compare old password
        const isMatch = await bcrypt.compare(currentPassword, doc.password);

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                error: "Current password is incorrect",
            });
        }

        // ✅ hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        doc.password = hashedPassword;
        await doc.save();

        res.json({
            success: true,
            message: "Password updated successfully",
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
});

// RESET PASSWORD
router.post("/reset-password", async (req, res) => {
    try {
        let { phone, newPassword, sessionId } = req.body;

        phone = String(phone || "")
            .replace(/\D/g, "")
            .slice(-10);

        if (!phone || !newPassword || !sessionId) {
            return res.status(400).json({
                success: false,
                error: "Missing required fields",
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: "Password must be at least 6 characters",
            });
        }

        // 🔍 Verify user
        const doc = await Doc.findOne({ phone });

        if (!doc) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }

        // 🔐 Hash new password
        const salt = await bcrypt.genSalt(10);
        doc.password = await bcrypt.hash(newPassword, salt);
        await doc.save();

        res.json({
            success: true,
            message: "Password reset successfully",
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

router.post("/add-staff", fetchuser, async (req, res) => {
    try {
        const doctorId = req.user.doctorId;

        if (!doctorId) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized",
            });
        }

        let { name, phone, role } = req.body;

        phone = phone.replace(/\D/g, "").slice(-10);

        if (!name || !phone || !role) {
            return res.status(400).json({
                success: false,
                error: "All fields are required",
            });
        }

        if (!["receptionist", "assistant", "nurse"].includes(role)) {
            return res.status(400).json({
                success: false,
                error: "Invalid role",
            });
        }

        const existing = await Staff.findOne({ phone });
        if (existing) {
            return res.status(400).json({
                success: false,
                error: "Staff with this number already exists",
            });
        }

        const staff = await Staff.create({
            doctorId: doctorId,
            name,
            phone,
            role,
        });

        res.json({
            success: true,
            staff,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: err,
        });
    }
});
router.get("/fetch-staff", fetchuser, async (req, res) => {
    try {
        const doctorId = req.user.doctorId;

        const staff = await Staff.find({
            doctorId: doctorId,
            isActive: true,
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            staff,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});
router.delete("/delete-staff/:id", fetchuser, async (req, res) => {
    try {
        const doctorId = req.user.doctorId;

        const staff = await Staff.findOneAndUpdate(
            { _id: req.params.id, doctorId },
            { isActive: false },
            { new: true }
        );

        if (!staff) {
            return res.status(404).json({
                success: false,
                error: "Staff not found",
            });
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});
router.post("/staff/send-otp", async (req, res) => {
    let phone = String(req.body.phone || "")
        .replace(/\D/g, "")
        .slice(-10);

    const staff = await Staff.findOne({ phone, active: true });
    if (!staff) {
        return res.status(400).json({
            success: false,
            error: "Staff not registered",
        });
    }

    const response = await axios.get(
        `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/${phone}/AUTOGEN/STAFF_LOGIN`
    );

    res.json({
        success: true,
        sessionId: response.data.Details,
    });
});
router.post("/staff/verify-otp", async (req, res) => {
    const { sessionId, otp, phone } = req.body;

    const response = await axios.get(
        `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/VERIFY/${sessionId}/${otp}`
    );

    if (response.data.Status !== "Success") {
        return res.status(400).json({
            success: false,
            error: "Invalid OTP",
        });
    }

    const staff = await Staff.findOne({ phone });

    const payload = {
        user: {
            id: staff._id,
            role: "staff",
            staffRole: staff.role,
            doctorId: staff.doctorId,
        },
    };

    const authtoken = jwt.sign(payload, JWT_SECRET);

    res.json({
        success: true,
        authtoken,
        role: staff.role,
        name: staff.name,
    });
});
router.post("/staff/login", async (req, res) => {
    try {
        const { phone, password } = req.body;

        const staff = await Staff.findOne({
            phone,
            isActive: true,
        });

        if (!staff) {
            return res.status(404).json({
                success: false,
                error: "Staff not found",
            });
        }

        // 🔹 FIRST LOGIN (NO PASSWORD YET)
        if (!staff.password) {
            return res.json({
                success: true,
                firstLogin: true,
                staffId: staff._id,
            });
        }

        // 🔹 NORMAL LOGIN
        const match = await bcrypt.compare(password, staff.password);
        if (!match) {
            return res.status(400).json({
                success: false,
                error: "Invalid password",
            });
        }

        const token = jwt.sign(
            {
                user: {
                    id: staff._id,
                    role: "staff",
                    staffRole: staff.role,
                    doctorId: staff.doctorId,
                },
            },
            JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({
            success: true,
            token,
            role: staff.role, // receptionist | nurse | assistant
            name: staff.name, // ✅ REQUIRED
        });
    } catch (err) {
        res.status(500).json({ success: false, error: "Server error" });
    }
});

router.post("/staff/set-password", async (req, res) => {
    const { staffId, password } = req.body;

    if (!password || password.length < 6) {
        return res.status(400).json({
            success: false,
            error: "Password must be at least 6 characters",
        });
    }

    const staff = await Staff.findById(staffId);
    if (!staff || staff.password) {
        return res.status(400).json({
            success: false,
            error: "Invalid request",
        });
    }

    const salt = await bcrypt.genSalt(10);
    staff.password = await bcrypt.hash(password, salt);
    await staff.save();

    const token = jwt.sign(
        {
            user: {
                id: staff._id,
                role: "staff",
                staffRole: staff.role,
                doctorId: staff.doctorId,
            },
        },
        JWT_SECRET,
        { expiresIn: "1d" }
    );

    res.json({ success: true, token, role: "staff", name: staff.name });
});
// ================= GET LOGGED-IN STAFF PROFILE =================
router.get("/staff", fetchuser, async (req, res) => {
    try {
        if (!req.user || req.user.role === "doctor") {
            return res.status(403).json({
                success: false,
                error: "Not staff",
            });
        }

        const staff = await Staff.findById(req.user.id).select("-password");

        if (!staff) {
            return res.status(404).json({
                success: false,
                error: "Staff not found",
            });
        }

        res.json({
            success: true,
            staff,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

// UPDATE STAFF
router.put("/edit-staff/:id", fetchuser, async (req, res) => {
    try {
        const doctorId = req.user.doctorId;
        const { name, phone, role } = req.body;

        const staff = await Staff.findOne({
            _id: req.params.id,
            doctorId: doctorId,
            isActive: true,
        });

        if (!staff) {
            return res.status(404).json({
                success: false,
                error: "Staff not found",
            });
        }

        if (name) staff.name = name;
        if (phone) staff.phone = phone.replace(/\D/g, "").slice(-10);
        if (role) staff.role = role;

        await staff.save();

        res.json({
            success: true,
            staff,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

router.post("/addservice", fetchuser, async (req, res) => {
    if (req.user.role !== "doctor") {
        return res.status(403).json({ error: "Doctor only" });
    }
});

router.get("/dashboard/analytics", fetchuser, async (req, res) => {
    try {
        const doctorId = req.user.id;
        const { payments, services, gender, startDate, endDate } = req.query;

        const pipeline = [
            // 🔒 Doctor scope
            {
                $match: {
                    doctor: new mongoose.Types.ObjectId(doctorId),
                },
            },

            // 🔗 Join Patient (for gender)
            {
                $lookup: {
                    from: "patients",
                    localField: "patient",
                    foreignField: "_id",
                    as: "patientInfo",
                },
            },
            { $unwind: "$patientInfo" },

            // 🔹 Gender filter
            ...(gender ? [{ $match: { "patientInfo.gender": gender } }] : []),

            // 🔹 Unwind visits
            { $unwind: "$visits" },

            // 🔹 Date filter
            ...(startDate || endDate
                ? [
                      {
                          $match: {
                              "visits.date": {
                                  ...(startDate && {
                                      $gte: new Date(startDate),
                                  }),
                                  ...(endDate && {
                                      $lte: new Date(endDate),
                                  }),
                              },
                          },
                      },
                  ]
                : []),

            // 🔹 Payment filter
            ...(payments
                ? [
                      {
                          $match: {
                              "visits.payment_type": {
                                  $in: payments.split(","),
                              },
                          },
                      },
                  ]
                : []),

            // 🔹 SERVICE FILTER (🔥 MOVED HERE 🔥)
            ...(services
                ? [
                      { $unwind: "$visits.service" },
                      {
                          $match: {
                              "visits.service.name": {
                                  $in: services.split(","),
                              },
                          },
                      },
                  ]
                : []),

            // ================= FACET =================
            {
                $facet: {
                    // PAYMENT SUMMARY
                    paymentSummary: [
                        {
                            $group: {
                                _id: "$visits.payment_type",
                                total: { $sum: "$visits.amount" },
                            },
                        },
                        {
                            $project: {
                                _id: 0,
                                type: "$_id",
                                total: 1,
                            },
                        },
                    ],

                    // SERVICE SUMMARY
                    serviceSummary: [
                        ...(services ? [] : [{ $unwind: "$visits.service" }]),
                        {
                            $group: {
                                _id: "$visits.service.name",
                                total: {
                                    $sum: "$visits.service.amount",
                                },
                            },
                        },
                        {
                            $project: {
                                _id: 0,
                                service: "$_id",
                                total: 1,
                            },
                        },
                    ],

                    // TOTAL COLLECTION (✅ NOW FILTERED)
                    totalCollection: [
                        {
                            $group: {
                                _id: null,
                                total: { $sum: "$visits.amount" },
                            },
                        },
                    ],

                    // TOTAL VISITS (✅ NOW FILTERED)
                    totalVisits: [{ $count: "count" }],
                },
            },
        ];

        const analytics = await Appointment.aggregate(pipeline);
        const result = analytics[0];

        res.json({
            success: true,
            paymentSummary: result.paymentSummary,
            serviceSummary: result.serviceSummary,
            totalCollection: result.totalCollection[0]?.total || 0,
            totalVisits: result.totalVisits[0]?.count || 0,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Dashboard analytics failed",
        });
    }
});

router.put("/doctor/theme", fetchuser, async (req, res) => {
    try {
        const { theme } = req.body;

        if (!theme || !["light", "dark"].includes(theme)) {
            return res.status(400).json({ error: "Invalid theme value" });
        }

        const doctor = await Doc.findByIdAndUpdate(
            req.user.id, // set by fetchuser middleware
            { theme },
            { new: true }
        ).select("theme");

        res.json({
            success: true,
            theme: doctor.theme,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
