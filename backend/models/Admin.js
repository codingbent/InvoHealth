const mongoose = require("mongoose");
const { Schema } = mongoose;

const AdminSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        password: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            default: "superadmin",
        },
    },
    { timestamps: true },
);

module.exports = mongoose.model("Admin", AdminSchema);
