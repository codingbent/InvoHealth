const express = require("express");
const router = express.Router();
const Doc = require("../models/Doc");
const Patient = require("../models/Patient");
const Service = require("../models/Service")
const Appointment =require("../models/Appointment")
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
var fetchuser = require("../middleware/fetchuser");
const JWT_SECRET = "abhedagarwal%male";

//CREATE A Doctor USING : POST "/API/AUTH" Doesn't require auth

router.post(
    "/createdoc",
    [
        body("name").isLength({ min: 3 }),
        body("email").isEmail(),
        body("password").isLength({ min: 5 }),
    ],
    async (req, res) => {
        var success = false;
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        //console.log(req.body.email);
        try {
            let doc = await Doc.findOne({ email: req.body.email });
            //console.log(doc);
            
            if (doc) {
                return res
                    .status(400)
                    .json({ success: false, errors: "Sorry doc exists" });
            }
            const salt = await bcrypt.genSalt(10);
            const secPass = await bcrypt.hash(req.body.password, salt);
            doc = await Doc.create({
                name: req.body.name,
                password: secPass,
                email: req.body.email,
            });
            const data = {
                doc: {
                    id: doc.id,
                },
            };
            const authtoken = jwt.sign(data, JWT_SECRET);
            ////console.log(authtoken);
            success = true;
            res.json({ success, authtoken });
        } catch (error) {
            console.error(error.message);
            res.status(500).json({success,error: "Internal server error"});
        }
    }
);

// Creating a Patient using : POST "/API/AUTH" Doesn't require auth

router.post(
    "/addpatient",
    [
        body("name", "Enter Name").notEmpty(),
        body("service"),
        body("number"),
        body("amount"),
        body("age")
        .optional({ checkFalsy: true }) // allows empty string or missing field
        .isNumeric().withMessage("Amount must be a number"),
    ],
    async (req, res) => {
        let success = false;
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            //console.log(errors.errors[0]);
            return res.status(400).json({ success, errors: errors.array() });
        }

        try {
            const patient = await Patient.create({
                name: req.body.name,
                service: req.body.service,
                number: req.body.number,
                amount: req.body.amount,
                age:req.body.age
            });

            success = true;
            res.json({ success, patient }); // send both success + created doc
            //console.log("Successfully Added Patient");
        } catch (err) {
            console.error(err.message);
            res.status(500).json({ success, error: "Server error, please try again later" });
        }
    }
);


//Creating a Service using : POST "/API/AUTH" Doesn't require auth

router.post("/createservice",[
    body("name").notEmpty(),
    body("amount").isNumeric(),
],async(req,res)=>{
    try{
        var success=false;
        const existingservice=await Service.findOne({name:req.body.name})
        if(existingservice){
            return res.status(400).json({success,error:"Service already exists"})
        }
        const service = await Service.create({
            name:req.body.name,
            amount:req.body.amount
        })
        success=true;
        //console.log("Successfull Send");
        return res.status(200).json({success,status:"Added successfully"});
    }
    catch (error) {
            console.error(error.message);
            res.status(500).json({success,error: "Internal server error"});
        }
}
)


// Fetch all services 

router.get("/fetchallservice",
async(req,res)=>{
    var success=false;
    const service=await Service.find({});
    res.json(service);
}
)


//fetch all patients

router.get("/fetchallpatients",
    async(req,res)=>{
        var success=false;
        const patient=await Patient.find({})
        res.json(patient)
    }
)

//fetch patient details

router.get("/patientdetails/:id", async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id); 
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }
    res.json(patient);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
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
      return res.status(400).json({ message: "Service must be an array" });
    }

    if (amount == null) {
      return res.status(400).json({ message: "Amount is required" });
    }

    // Find appointment record for this patient and add new visit
    const appointment = await Appointment.findOneAndUpdate(
      { patient: patientId },
      {
        $push: {
          visits: {
            date: new Date(),
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
    const appointments = await Appointment.find({ patient: req.params.patientId });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post(
    "/login",
    [
        body("password", "Enter Password").exists(),
        body("email", "Enter Email").isEmail(),
    ],
    async (req, res) => {
        var success = false;
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        try {
            let doc = await Doc.findOne({ email });
            if (!doc) {
                return res
                    .status(400)
                    .json({ error: "Sorry Enter correct credentials" });
            }
            const passwordcompare = await bcrypt.compare(
                password,
                doc.password
            );

            if (!passwordcompare) {
                success = false;
                return res.status(400).json({
                    success,
                    error: "Sorry Enter correct credentials",
                });
            }
            const payload = {
                doc: {
                    id: doc.id,
                },
            };
            const authtoken = jwt.sign(payload, JWT_SECRET);
            success = true;
            res.json({
                success,
                authtoken,
                name: doc.name,
                email: doc.email,
            });
        } catch (e){
            console.error(e.message);
            ////console.log(e.message);

            res.status(500).send("Internal server error");
        }
    }
);
module.exports = router;
