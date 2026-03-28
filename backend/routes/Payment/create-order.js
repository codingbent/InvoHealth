const express = require("express");
const router = express.Router();

const razorpay = require("../config/razorpay");
const fetchuser = require("../../middleware/fetchuser");
const Doc = require("../../models/Doc");

const PLAN_IDS = {
    starter: "plan_SWm3Dlw42Oohex",
    pro: "plan_SWlzksnJF0zZ0L",
    enterprise: "plan_SWm054TxXJdS0L",
};

// plan_SWlzTMtBybU2iK. 199rs   Starter plan
// plan_SWm3Dlw42Oohex. 1rs  Starter plan

router.post("/create-subscription", fetchuser, async (req, res) => {
    try {
        const { plan } = req.body;

        const planId = PLAN_IDS[plan.toLowerCase()];
        if (!planId) {
            return res.status(400).json({
                success: false,
                error: "Invalid plan",
            });
        }

        let doc = await Doc.findById(req.user.doctorId);

        let customerId = doc.subscription?.customerId;

        // HANDLE CUSTOMER PROPERLY
        if (!customerId) {
            try {
                const customer = await razorpay.customers.create({
                    name: doc.name || "Doctor",
                    email: doc.email || "test@example.com",
                });

                customerId = customer.id;
            } catch (err) {
                // If already exists → fetch it
                if (
                    err.error &&
                    err.error.description ===
                        "Customer already exists for the merchant"
                ) {
                    const customers = await razorpay.customers.all({
                        email: doc.email,
                    });

                    if (customers.items.length > 0) {
                        customerId = customers.items[0].id;
                    } else {
                        throw new Error("Customer exists but not found");
                    }
                } else {
                    throw err;
                }
            }

            // Save customerId once
            await Doc.findByIdAndUpdate(req.user.doctorId, {
                "subscription.customerId": customerId,
            });
        }

        // CREATE SUBSCRIPTION (with await!)
        const subscription = await razorpay.subscriptions.create({
            plan_id: planId,
            customer_id: customerId,
            customer_notify: 1,
            total_count: 12, // months
        });

        res.json({
            success: true,
            subscription,
        });
    } catch (err) {
        console.error("RAZORPAY ERROR:", err);

        res.status(500).json({
            success: false,
            error: err.error?.description || err.message,
        });
    }
});
module.exports = router;
