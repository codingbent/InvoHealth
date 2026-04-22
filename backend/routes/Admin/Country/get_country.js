const express = require("express");
const router = express.Router();
const Country = require("../../../models/Country");

router.get("/country", async (req, res) => {
    try {
        const countries = await Country.find();
        res.json({ success: true, countries });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

module.exports = router;