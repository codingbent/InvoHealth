require("dotenv").config();
const connectToMongo = require("./db");
const express = require("express");
const cors = require("cors");
const appointmentReport = require("./routes/appointmentReport");

connectToMongo();
const app = express();
const port = process.env.PORT || 5001;

const allowedOrigins = ["https://invohealth.vercel.app", "http://localhost:3000"];

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
        allowedHeaders: ["Content-Type", "Authorization", "auth-token"],
        credentials: true,
    })
);

// Handle preflight
app.options("*", cors());

app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/report", appointmentReport);

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
