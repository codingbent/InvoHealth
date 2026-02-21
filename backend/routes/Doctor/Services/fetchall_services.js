const express = require("express");
const router = express.Router();
const Service = require("../../../models/Service");
var fetchuser = require("../../../middleware/fetchuser");

router.get("/fetchall_services", fetchuser, async (req, res) => {
    try {
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

module.exports = router;
