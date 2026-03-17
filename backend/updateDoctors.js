require("dotenv").config();
const mongoose = require("mongoose");

const Payment = require("./models/Payment");
const Doc = require("./models/Doc");

async function updateDoctors() {
    try {

        await mongoose.connect(process.env.MONGO_URL);

        console.log("MongoDB connected");

        const docs = await Doc.find();

        for (const d of docs) {

            if (d.subscription?.paymentId) {

                const exists = await Payment.findOne({
                    paymentId: d.subscription.paymentId
                });

                if (!exists) {

                    await Payment.create({
                        doctorId: d._id,
                        plan: d.subscription.plan,
                        billingCycle: d.subscription.billingCycle,
                        amountPaid: d.subscription.amountPaid,
                        paymentId: d.subscription.paymentId,
                        orderId: d.subscription.orderId,
                        currency: "INR",
                        paidAt: d.subscription.startDate
                    });

                    console.log("Migrated payment for:", d.email);
                }

            }

        }

        console.log("Migration completed");

        process.exit();

    } catch (err) {

        console.error(err);
        process.exit(1);

    }
}

updateDoctors();