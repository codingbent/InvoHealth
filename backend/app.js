require("dotenv").config();
const connectToMongo = require("./db");
const express = require("express");
const cors = require("cors");
const mongoSanitize = require("express-mongo-sanitize");
const helmet = require("helmet");

connectToMongo();
require("./models/Doc");
require("./models/Patient");
require("./models/Service");
require("./models/Appointment");
require("./models/Staff");
require("./models/Admin");
require("./models/Pricing");
require("./models/Payment");
require("./models/PaymentMethod");
require("./models/Otpsessions");

// console.log("Loaded models:", Object.keys(require("mongoose").models));

const app = express();
const port = process.env.PORT || 5001;

const allowedOrigins = [
    "https://invohealth.vercel.app",
    "http://localhost:3000",
    "http://localhost:3001",
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "auth-token",
        "admin-token",
    ],
    credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Payment ENV validation (FAIL FAST)
// app.js — add to requiredEnv
const requiredEnv = [
    "MONGO_URL",
    "Razor_Pay_Key_ID",
    "Razor_Pay_Key_Secret",
    "PAYPAL_CLIENT_ID",
    "PAYPAL_CLIENT_SECRET",
    "JWT_SECRET",
    "ADMIN_JWT_SECRET",
    "CRYPTO_SECRET",
    "PAYPAL_WEBHOOK_ID",
];

const missing = requiredEnv.filter((key) => !process.env[key]);

if (missing.length > 0) {
    console.error("FATAL: Missing ENV variables:", missing.join(", "));
    process.exit(1);
}

console.log("Payment ENV variables loaded successfully");

app.use(
    "/api/payment/paypal-webhook",
    express.raw({ type: "application/json" }),
);

app.use(express.json());

app.use(helmet());

app.use(
    mongoSanitize({
        replaceWith: "_", // replaces $ and . with _
    }),
);

app.get("/api/health", (req, res) => {
    res.json({ status: "OK" });
});
app.use("/api/doctor", require("./routes/Doctor/index_doctor"));
app.use("/api/staff", require("./routes/Staff/index_staff"));
app.use("/api/admin", require("./routes/Admin/index_admin"));
app.use("/api/payment", require("./routes/Payment/index_payment"));

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
