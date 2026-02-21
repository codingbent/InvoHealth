const express = require("express");
const router = express.Router();
const Doc = require("../../models/Doc");
var fetchuser = require("../../middleware/fetchuser");

router.get("/get_doc", fetchuser, async (req, res) => {
    try {
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

module.exports=router