// config/planIds.js — separate file
module.exports = {
    starter: {
        monthly: process.env.RAZORPAY_STARTER_MONTHLY,
        yearly: process.env.RAZORPAY_STARTER_YEARLY,
    },
    pro: {
        monthly: process.env.RAZORPAY_PRO_MONTHLY,
        yearly: process.env.RAZORPAY_PRO_YEARLY,
    },
    enterprise: {
        monthly: process.env.RAZORPAY_ENTERPRISE_MONTHLY,
        yearly: process.env.RAZORPAY_ENTERPRISE_YEARLY,
    },
};
