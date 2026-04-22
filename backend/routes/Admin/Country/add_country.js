const express = require("express");
const router = express.Router();
const Country = require("../../../models/Country");
const fetchadmin = require("../../../middleware/fetchadmin");

router.post("/add_country", fetchadmin, async (req, res) => {
    try {
        const { code, name, currency,dialCode, symbol, rate } = req.body;

        const country = await Country.create({
            code,
            name,
            currency,
            dialCode,
            symbol,
            rate,
            multiplier: 1,
        });

        res.json({ success: true, country });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

module.exports = router;