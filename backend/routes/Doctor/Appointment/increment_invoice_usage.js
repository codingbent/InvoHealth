const express = require("express");
const router = express.Router();
const Doc = require("../../../models/Doc");
var fetchuser = require("../../../middleware/fetchuser");

router.post("/increment_invoice_usage", fetchuser, async (req, res) => {
    try {

        await Doc.findByIdAndUpdate(req.user.doctorId, {
            $inc: { "usage.invoiceDownloads": 1 },
        });

        res.json({
            success: true
        });

    } catch (err) {
        console.error(err);

        res.status(500).json({
            success: false,
            error: "Server error"
        });
    }
});

module.exports=router;