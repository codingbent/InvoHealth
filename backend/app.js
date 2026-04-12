require("dotenv").config();
const connectToMongo = require("./db");
const express = require("express");
const cors = require("cors");

connectToMongo();
require("./models/Doc");
require("./models/Patient");
require("./models/Service");
require("./models/Appointment");
require("./models/Staff");
require("./models/Admin");
require("./models/Pricing");
require("./models/Payment");

// console.log("Loaded models:", Object.keys(require("mongoose").models));

const app = express();
const port = process.env.PORT || 5001;

const allowedOrigins = [
    "https://invohealth.vercel.app",
    "http://localhost:3000",
    "http://localhost:3001",
];

app.use(
    cors({
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
    }),
);

app.options("*", cors());

app.use(express.json());

app.get("/api/health", (req, res) => {
    res.json({ status: "OK" });
});
app.use("/api/doctor", require("./routes/Doctor/index_doctor"));
app.use("/api/staff", require("./routes/Staff/index_staff"));
app.use("/api/authentication", require("./routes/authentication"));
app.use("/api/admin", require("./routes/Admin/index_admin"));
app.use("/api/payment", require("./routes/Payment/index_payment"));

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
