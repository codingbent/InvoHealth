const Razorpay = require("razorpay");

if (!process.env.Razor_Pay_Key_ID || !process.env.Razor_Pay_Key_Secret) {
    throw new Error("Razorpay ENV vars missing");
}

const razorpay = new Razorpay({
    key_id: process.env.Razor_Pay_Key_ID,
    key_secret: process.env.Razor_Pay_Key_Secret,
});

module.exports = razorpay;
