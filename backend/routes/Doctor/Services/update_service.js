const express = require("express");
const router = express.Router();
const Service = require("../../../models/Service");

router.put("/update_service/:id", async (req, res) => {
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

module.exports = router;
