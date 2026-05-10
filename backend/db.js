require("dotenv").config();
const mongoose = require("mongoose");
const mongourl = process.env.MONGO_URL;

const connectToMongo = () => {
    mongoose
        .connect(mongourl, {
            serverSelectionTimeoutMS: 5000,
            heartbeatFrequencyMS: 10000,
        })
        .then(() => {
            // console.log('Connected to MongoDB');
        })
        .catch((err) => {
            console.error("Error connecting to MongoDB:", err);
            process.exit(1);
        });

    mongoose.connection.on("disconnected", () => {
        console.error(
            "[MongoDB] Disconnected — Mongoose will attempt to reconnect automatically.",
        );
    });

    mongoose.connection.on("reconnected", () => {
        console.log("[MongoDB] Reconnected successfully.");
    });

    mongoose.connection.on("error", (err) => {
        console.error("[MongoDB] Connection error:", err.message);
    });
};

module.exports = connectToMongo;
