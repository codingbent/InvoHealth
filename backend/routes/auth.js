const express = require("express");
const router = express.Router();
const Doc = require("../models/Doc");
const Patient = require("../models/Patient");
const Service = require("../models/Service");
const Appointment = require("../models/Appointment");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
var fetchuser = require("../middleware/fetchuser");
const JWT_SECRET = process.env.JWT_SECRET;
const authMiddleware = require("../../middleware/auth"); // if using auth

//CREATE A Doctor USING : POST "/API/AUTH" Doesn't require auth

router.post(
    "/createdoc",
    [
        body("name").isLength({ min: 3 }),
        body("email").isEmail(),
        body("password").isLength({ min: 5 }),
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
                    .json({ success, error: "Doctor already exists" });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(req.body.password, salt);

            doc = await Doc.create({
                name: req.body.name,
                email: req.body.email,
                password: hashedPassword,
            });

            const payload = { doc: { id: doc.id } };
            const authtoken = jwt.sign(payload, JWT_SECRET);

            success = true;
            res.json({ success, authtoken });
        } catch (error) {
            console.error(error.message);
            res.status(500).json({ success, error: "Internal server error" });
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
            console.error(err.message);
            res.status(500).json({
                success,
                error: "Server error, try again later",
            });
        }
    }
);

//Creating a Service using : POST "/API/AUTH" Doesn't require auth

router.post(
  "/createservice",
  fetchuser,
  [
    body("name").notEmpty(),
    body("amount").isNumeric(),
  ],
  async (req, res) => {
    try {
      // 🔑 Use req.doc.id (from fetchuser), not req.doc
      const existingService = await Service.findOne({
        name: req.body.name,
        doctor: req.doc.id, // consistent with schema
      });

      if (existingService) {
        return res
          .status(400)
          .json({ success: false, error: "Service already exists for this doctor" });
      }

      const service = await Service.create({
        name: req.body.name,
        amount: req.body.amount,
        doctor: req.doc.id, // consistent with schema
      });

      res
        .status(200)
        .json({ success: true, status: "Added successfully", service });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);

// Fetch all services

// Fetch all services for the logged-in doctor
// routes/service.js
router.get("/fetchallservice", fetchuser, async (req, res) => {
  try {
    const services = await Service.find({ doctor: req.doc.id });
    res.json(services);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Server error" });
  }
});



//fetch all patients

router.get("/fetchallpatients", fetchuser, async (req, res) => {
    try {
        // Only fetch patients created by the logged-in doctor
        const patients = await Patient.find({ doctor: req.doc.id });

        // For each patient, get last appointment date
        const patientsWithLast = await Promise.all(
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

// POST /api/auth/addappointment/:id
router.post("/addappointment/:id", async (req, res) => {
    try {
        const { service, amount } = req.body;
        const patientId = req.params.id;

        if (!service || !Array.isArray(service)) {
            return res
                .status(400)
                .json({ message: "Service must be an array" });
        }

        if (amount == null) {
            return res.status(400).json({ message: "Amount is required" });
        }

        // Convert current time to IST
        const now = new Date();
        const istOffset = 5.5 * 60; // IST offset in minutes
        const istDate = new Date(now.getTime() + istOffset * 60000);

        // Find appointment record for this patient and add new visit
        const appointment = await Appointment.findOneAndUpdate(
            { patient: patientId },
            {
                $push: {
                    visits: {
                        date: istDate,
                        service,
                        amount,
                    },
                },
            },
            { upsert: true, new: true } // Create if not exists
        );

        res.status(201).json({
            success: true,
            message: "Appointment added successfully",
            appointment,
        });
    } catch (err) {
        console.error(err.message);
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
// PUT /api/auth/updateappointment/:appointmentId
router.put("/updateappointment/:appointmentId/:visitId", authMiddleware, async (req, res) => {
  const { appointmentId, visitId } = req.params;
  const { date, service, amount } = req.body;

  if (!date || !service || !Array.isArray(service) || service.length === 0) {
    return res.status(400).json({ success: false, message: "Invalid data" });
  }

  try {
    // Find appointment by ID
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    // Find the specific visit
    const visit = appointment.visits.id(visitId);
    if (!visit) {
      return res.status(404).json({ success: false, message: "Visit not found" });
    }

    // Update visit fields
    visit.date = new Date(date);
    visit.service = service.map(s => ({
      id: s.id || null,
      name: s.name,
      amount: s.amount || 0,
    }));
    visit.amount = amount || visit.service.reduce((sum, s) => sum + (s.amount || 0), 0);

    await appointment.save();

    res.json({ success: true, visit });
  } catch (err) {
    console.error("Error updating visit:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/addappointment/:id", async (req, res) => {
    try {
        const { service, amount } = req.body;
        const patientId = req.params.id;

        if (!service || !Array.isArray(service)) {
            return res
                .status(400)
                .json({ message: "Service must be an array" });
        }

        if (amount == null) {
            return res.status(400).json({ message: "Amount is required" });
        }

        // Convert current time to IST
        const now = new Date();
        const istOffset = 5.5 * 60; // IST offset in minutes
        const istDate = new Date(now.getTime() + istOffset * 60000);

        // Find appointment record for this patient and add new visit
        const appointment = await Appointment.findOneAndUpdate(
            { patient: patientId },
            {
                $push: {
                    visits: {
                        date: istDate,
                        service,
                        amount,
                    },
                },
            },
            { upsert: true, new: true } // Create if not exists
        );

        res.status(201).json({
            success: true,
            message: "Appointment added successfully",
            appointment,
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "Server error" });
    }
});

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
module.exports = router;
