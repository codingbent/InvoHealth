const express = require("express");
const router = express.Router();
const Staff = require("../../../models/Staff");
var fetchuser = require("../../../middleware/fetchuser");
const requireDoctor = require("../../../middleware/requireDoctor");

router.delete(
    "/delete_staff/:id",
    fetchuser,
    requireDoctor,
    async (req, res) => {
        try {
            const doctorId = req.user.doctorId;

            const staff = await Staff.findOneAndUpdate(
                { _id: req.params.id, doctorId },
                { isDeleted: true },
                { new: true },
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
    },
);

module.exports = router;
