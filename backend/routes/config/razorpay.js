const Razorpay = require("razorpay");

const razorpay = new Razorpay({
    key_id: process.env.Razor_Pay_Key_ID,
    key_secret: process.env.Razor_Pay_Key_Secret,
});

module.exports = razorpay;