const express = require("express");
const router = express.Router();

const razorpay = require("../config/razorpay");
const fetchuser = require("../../middleware/fetchuser");
const Doc = require("../../models/Doc");

const PLAN_IDS = {
    starter: ["plan_SWm3Dlw42Oohex", "plan_SWnp5R920qpaJw"],
    pro: ["plan_SWlzksnJF0zZ0L", "plan_SWnq7CBXdaoxEq"],
    enterprise: ["plan_SWm054TxXJdS0L", "plan_SWnqOJA59g8gG0"],
};

// plan_SWlzTMtBybU2iK. 199rs   Starter plan
// plan_SWm3Dlw42Oohex. 1rs  Starter plan

router.post("/create-subscription", fetchuser, async (req, res) => {
    try {
        const { plan, billing } = req.body;

        const plans = PLAN_IDS[plan.toLowerCase()];

        if (!plans) {
            return res.status(400).json({
                success: false,
                error: "Invalid plan",
            });
        }

        const planId = billing === "yearly" ? plans[1] : plans[0];

        let doc = await Doc.findById(req.user.doctorId);
        let customerId = doc.subscription?.customerId;

        // HANDLE CUSTOMER
        if (!customerId) {
            try {
                const customer = await razorpay.customers.create({
                    name: doc.name || "Doctor",
                    email: doc.email || "test@example.com",
                });

                customerId = customer.id;
            } catch (err) {
                if (
                    err.error &&
                    err.error.description ===
                        "Customer already exists for the merchant"
                ) {
                    const customers = await razorpay.customers.all({
                        email: doc.email,
                    });

                    customerId = customers.items[0].id;
                } else {
                    throw err;
                }
            }

            await Doc.findByIdAndUpdate(req.user.doctorId, {
                "subscription.customerId": customerId,
            });
        }

        // 🔥 CREATE SUBSCRIPTION
        const subscription = await razorpay.subscriptions.create({
            plan_id: planId,
            customer_id: customerId,
            customer_notify: 1,
            total_count: billing === "yearly" ? 1 : 12,
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
