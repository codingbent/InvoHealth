const express = require("express");
const router = express.Router();
const Doc = require("../../models/Doc");
const fetchuser = require("../../middleware/fetchuser");
const {
    PaymentCategory,
    PaymentSubCategory,
} = require("../../models/PaymentMethod");

router.get("/payment_methods", fetchuser, async (req, res) => {
    try {
        const doctorId = req.user.doctorId;

        const doc = await Doc.findById(doctorId)
            .populate("paymentMethods.categoryId", "name")
            .populate("paymentMethods.subCategoryId", "name");

        if (!doc) {
            return res.status(404).json({
                success: false,
                error: "Doctor not found",
            });
        }

        // FILTER ACTIVE ONLY
        const methods = doc.paymentMethods
            .filter((m) => m.isActive)
            .map((m) => ({
                id: m.subCategoryId?._id,
                categoryId: m.categoryId?._id,
                categoryName: m.categoryId?.name,
                subCategoryId: m.subCategoryId?._id,
                subCategoryName: m.subCategoryId?.name,
                label: m.label,
            }));

        res.json({
            success: true,
            data: methods,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

router.put("/update_payment_methods", fetchuser, async (req, res) => {
    try {
        const doctorId = req.user.doctorId;
        const { paymentMethods } = req.body;

        if (!Array.isArray(paymentMethods)) {
            return res.status(400).json({
                success: false,
                error: "Invalid payment methods",
            });
        }

        const updated = await Doc.findByIdAndUpdate(
            doctorId,
            { $set: { paymentMethods } }, // ← use $set explicitly
            { new: true },
        );

        if (!updated) {
            return res
                .status(404)
                .json({ success: false, error: "Doctor not found" });
        }

        res.json({
            success: true,
            paymentMethods: updated.paymentMethods, // ← return saved data
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Server error" });
    }
});

router.get("/payment-master", fetchuser, async (req, res) => {
    try {
        const categories = await PaymentCategory.find({ isActive: true });

        const subCategories = await PaymentSubCategory.find({ isActive: true });

        res.json({
            success: true,
            categories,
            subCategories,
        });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

module.exports = router;
