const mongoose = require("mongoose");
require("dotenv").config();
const Doc = require("./models/Doc");

async function updateDoctors() {
    await mongoose.connect(process.env.MONGO_URL);

    const result = await Doc.updateMany(
        { subscription: { $exists: true } }, 
        {
            $set: {
                subscription: {
                    plan: "free",
                    status: "active",
                    startDate: new Date(),
                    expiryDate: null,
                    razorpaySubscriptionId: null,
                },
            },
        }
    );

    console.log("Updated doctors:", result.modifiedCount);
    process.exit();
}

updateDoctors();