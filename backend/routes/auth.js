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
const axios = require("axios");

const TWO_FACTOR_API_KEY = process.env.TWO_FACTOR_API_KEY;
const isValidIndianMobile = (phone) => /^[6-9]\d{9}$/.test(phone);

//CREATE A Doctor USING : POST "/API/AUTH" Doesn't require auth
router.post("/login", async (req, res) => {
    let success = false;
    const { identifier, password, loginType, identifierType } = req.body;

    try {
        let doc;

        // 🔍 Find user by email or phone
        if (identifierType === "email") {
            doc = await Doc.findOne({ email: identifier });
        } else if (identifierType === "phone") {
            doc = await Doc.findOne({ phone: identifier });
        } else {
            return res.status(400).json({
                success: false,
                error: "Invalid identifier type",
            });
        }

        if (!doc) {
            return res.status(400).json({
                success: false,
                error: "Invalid credentials",
            });
        }

        // 🔐 PASSWORD LOGIN
        if (loginType === "password") {
            if (!password) {
                return res.status(400).json({
                    success: false,
                    error: "Password required",
                });
            }

            const passwordCompare = await bcrypt.compare(
                password,
                doc.password
            );

            if (!passwordCompare) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid credentials",
                });
            }
        }

        // 🔑 OTP LOGIN (already verified)
        if (loginType === "otp") {
            // nothing extra to check here
        }

        // ✅ Generate token
        const payload = { doc: { id: doc.id } };
        const authtoken = jwt.sign(payload, JWT_SECRET);

        res.json({
            success: true,
            authtoken,
            name: doc.name,
            email: doc.email,
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
});

// Creating a Patient using : POST "/API/AUTH" Doesn't require auth
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

        // 👉 Gender validation (optional but allowed)
        body("gender")
            .optional()
            .isIn(["Male", "Female"])
            .withMessage("Gender must be Male, Female"),
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
                gender: req.body.gender, // ✅ Save gender
                doctor: doctorId,
                discount: req.body.discount, // NEW
                isPercent: req.body.isPercent,
            });

            success = true;
            res.json({ success, patient });
        } catch (err) {
            console.error("AddPatient error:", err);
            res.status(500).json({
                success,
                error: err.message,
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

router.post("/login", async (req, res) => {
    const { identifier, password, loginType, identifierType } = req.body;

    try {
        let doc;

        // 🔍 Find user
        if (identifierType === "email") {
            doc = await Doc.findOne({ email: identifier });
        } else if (identifierType === "phone") {
            doc = await Doc.findOne({ phone: identifier });
        } else {
            return res.status(400).json({
                success: false,
                error: "Invalid identifier type",
            });
        }

        if (!doc) {
            return res.status(400).json({
                success: false,
                error: "Invalid credentials",
            });
        }

        // 🔐 PASSWORD LOGIN
        if (loginType === "password") {
            if (!password) {
                return res.status(400).json({
                    success: false,
                    error: "Password required",
                });
            }

            const passwordCompare = await bcrypt.compare(
                password,
                doc.password
            );

            if (!passwordCompare) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid credentials",
                });
            }
        }

        // 🔑 OTP LOGIN
        // Firebase already verified phone → no password check
        if (loginType !== "password" && loginType !== "otp") {
            return res.status(400).json({
                success: false,
                error: "Invalid login type",
            });
        }

        // ✅ ISSUE JWT
        const payload = { doc: { id: doc.id } };
        const authtoken = jwt.sign(payload, JWT_SECRET);

        return res.json({
            success: true,
            authtoken,
            name: doc.name,
            email: doc.email,
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal server error");
    }
});

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

router.put("/updatedoc", fetchuser, async (req, res) => {
    try {
        const updated = await Doc.findByIdAndUpdate(
            req.doc.id,
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
        const limit = parseInt(req.query.limit) || 10;

        const appointments = await Appointment.find({
            doctor: req.doc.id,
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

        // 3️⃣ Sort newest first
        allVisits.sort((a, b) => new Date(b.date) - new Date(a.date));

        // 4️⃣ Apply limit
        const limitedVisits = allVisits.slice(0, limit);

        res.json({
            total: allVisits.length,
            data: limitedVisits,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

router.get("/exportappointments", fetchuser, async (req, res) => {
    try {
        const appointments = await Appointment.find({
            doctor: req.doc.id,
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

router.post("/send-otp", async (req, res) => {
    const phone = String(req.body.phone || "").replace(/\D/g, "");

    if (!isValidIndianMobile(phone)) {
        return res.status(400).json({
            success: false,
            error: "Invalid mobile number",
        });
    }

    try {
        const response = await axios.get(
            `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/${phone}/AUTOGEN`
        );

        if (response.data.Status === "Success") {
            res.json({
                success: true,
                sessionId: response.data.Details,
            });
        } else {
            res.status(400).json({
                success: false,
                error: "OTP could not be sent",
            });
        }
    } catch (err) {
        res.status(500).json({
            success: false,
            error: "OTP service unavailable",
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

        const payload = { doc: { id: doc.id } };
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

        const doc = await Doc.findById(req.doc.id);

        if (!doc) {
            return res.status(404).json({
                success: false,
                error: "Doctor not found",
            });
        }

        // ✅ compare old password
        const isMatch = await bcrypt.compare(
            currentPassword,
            doc.password
        );

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

module.exports = router;
