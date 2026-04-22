const express = require("express");
const router = express.Router();

const {
    PaymentCategory,
    PaymentSubCategory,
} = require("../../models/PaymentMethod");

router.get("/all", async (req, res) => {
    try {
        const categories = await PaymentCategory.find({
            isActive: true,
        }).lean();
        const subcategories = await PaymentSubCategory.find({
            isActive: true,
        }).lean();

        const subMap = {};

        subcategories.forEach((sub) => {
            const key = sub.categoryId.toString();
            if (!subMap[key]) subMap[key] = [];
            subMap[key].push({
                _id: sub._id,
                name: sub.name,
            });
        });

        // Final result
        const result = categories.map((cat) => ({
            _id: cat._id,
            name: cat.name,
            subcategories: subMap[cat._id.toString()] || [],
        }));

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: "Server error" });
    }
});

module.exports = router;
