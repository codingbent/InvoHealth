const express = require("express");
const router = express.Router();
const Doc = require("../../models/Doc");
const fetchuser = require("../../middleware/fetchuser");

router.get("/get_doc", fetchuser, async (req, res) => {
    try {
        const doctorId =
            req.user.role === "doctor" ? req.user.id : req.user.doctorId;

        const doc = await Doc.findById(doctorId)
            .select("-password")
            .populate("staff", "name email role");

        if (!doc) {
            return res.status(404).json({
                success: false,
                error: "Doctor not found",
            });
        }

        res.json({
            success: true,

            doctor: {
                id: doc._id,
                name: doc.name,
                email: doc.email,
                clinicName: doc.clinicName,
                phone: doc.phone,
                appointmentPhone: doc.appointmentPhone,
                address: doc.address,
                degree: doc.degree,
                experience: doc.experience,
                regNumber: doc.regNumber,

                subscription: {
                    plan: doc.subscription?.plan || "FREE",
                    billingCycle: doc.subscription?.billingCycle || "monthly",
                    status: doc.subscription?.status || "active",
                    startDate: doc.subscription?.startDate || null,
                    expiryDate: doc.subscription?.expiryDate || null,
                    amountPaid: doc.subscription?.amountPaid || 0,
                    currency: doc.subscription?.currency || "INR",
                },

                usage: {
                    excelExports: doc.usage?.excelExports || 0,
                    invoiceDownloads: doc.usage?.invoiceDownloads || 0,
                },

                staffCount: doc.staff?.length || 0,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
});

module.exports=router