const express = require("express");
const router = express.Router();
const Doc = require("../models/Doc");
const Patient = require("../models/Patient");
const Service = require("../models/Service")
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

        console.log(req.body.email);
        try {
            let doc = await Doc.findOne({ email: req.body.email });
            console.log(doc);
            
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
            //console.log(authtoken);
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
        body("amount")
        .optional({ checkFalsy: true }) // allows empty string or missing field
        .isNumeric().withMessage("Amount must be a number"),
    ],
    async (req, res) => {
        let success = false;
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log(errors.errors[0]);
            return res.status(400).json({ success, errors: errors.array() });
        }

        try {
            const patient = await Patient.create({
                name: req.body.name,
                service: req.body.service,
                number: req.body.number,
                amount: req.body.amount,
            });

            success = true;
            res.json({ success, patient }); // send both success + created doc
            console.log("Successfully Added Patient");
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
        console.log("Successfull Send");
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

)

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
            //console.log(e.message);

            res.status(500).send("Internal server error");
        }
    }
);
module.exports = router;
