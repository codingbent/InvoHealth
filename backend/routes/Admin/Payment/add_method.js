const express = require("express");
const router = express.Router();

const {
    PaymentCategory,
    PaymentSubCategory,
} = require("../../../models/PaymentMethod");
const Payment = require("../../../models/Payment");
const fetchadmin = require("../../../middleware/fetchadmin");

router.post("/add-category", fetchadmin, async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ error: "Category name required" });
        }

        // Check duplicate
        const existing = await PaymentCategory.findOne({
            name: name.trim(),
        });

        if (existing) {
            return res.status(400).json({ error: "Category already exists" });
        }

        const category = await PaymentCategory.create({
            name: name.trim(),
        });

        res.json({
            success: true,
            message: "Category added successfully",
            category,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

router.post("/add-subcategory", fetchadmin, async (req, res) => {
    try {
        const { name, categoryId } = req.body;

        if (!name || !categoryId) {
            return res
                .status(400)
                .json({ error: "Name and categoryId required" });
        }

        // Check category exists
        const category = await PaymentCategory.findById(categoryId);
        if (!category) {
            return res.status(404).json({ error: "Category not found" });
        }

        // Prevent duplicate inside same category
        const existing = await PaymentSubCategory.findOne({
            name: name.trim(),
            categoryId,
        });

        if (existing) {
            return res
                .status(400)
                .json({ error: "Subcategory already exists in this category" });
        }

        const subCategory = await PaymentSubCategory.create({
            name: name.trim(),
            categoryId,
        });

        res.json({
            success: true,
            message: "Subcategory added successfully",
            subCategory,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

// DELETE CATEGORY
router.delete("/delete-category/:id", fetchadmin, async (req, res) => {
    await PaymentCategory.findByIdAndUpdate(req.params.id, {
        isActive: false,
    });
    res.json({ success: true });
});

// DELETE SUBCATEGORY
router.delete("/delete-subcategory/:id", fetchadmin, async (req, res) => {
    await PaymentSubCategory.findByIdAndUpdate(req.params.id, {
        isActive: false,
    });
    res.json({ success: true });
});

// UPDATE CATEGORY
router.put("/update-category/:id", fetchadmin, async (req, res) => {
    const { name } = req.body;

    const updated = await PaymentCategory.findByIdAndUpdate(
        req.params.id,
        { name },
        { new: true },
    );

    res.json({ success: true, updated });
});

// UPDATE SUBCATEGORY
router.put("/update-subcategory/:id", fetchadmin, async (req, res) => {
    const { name } = req.body;

    const updated = await PaymentSubCategory.findByIdAndUpdate(
        req.params.id,
        { name },
        { new: true },
    );

    res.json({ success: true, updated });
});

module.exports = router;
