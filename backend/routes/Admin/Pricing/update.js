const express = require("express");
const router = express.Router();
const fetchadmin = require("../../../middleware/fetchadmin");
const Pricing = require("../../../models/Pricing");

router.post("/pricing/update", fetchadmin, async (req, res) => {
    try {
        const { starter, pro, enterprise, discount } = req.body;

        const validatePlan = (plan) => {
            return (
                typeof plan.monthly === "number" &&
                plan.monthly > 0 &&
                typeof plan.staffLimit === "number" &&
                typeof plan.excelLimit === "number" &&
                typeof plan.invoiceLimit === "number" &&
                typeof plan.imageLimit === "number"
            );
        };

        if (!starter || !pro || !enterprise) {
            return res.status(400).json({
                success: false,
                error: "Invalid pricing payload",
            });
        }

        if (
            !validatePlan(starter) ||
            !validatePlan(pro) ||
            !validatePlan(enterprise)
        ) {
            return res.status(400).json({
                success: false,
                error: "Invalid plan values",
            });
        }

        const safeDiscount =
            typeof discount === "number" && discount >= 0 && discount <= 100
                ? discount
                : 17;

        const pricingData = {
            discount: safeDiscount,
            starter,
            pro,
            enterprise,
            updatedAt: new Date(),
        };

        const pricing = await Pricing.findOneAndUpdate({}, pricingData, {
            new: true,
            upsert: true,
        });

        res.json({
            success: true,
            pricing,
        });
    } catch (error) {
        console.error("Pricing update error:", error);

        res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

module.exports = router;
