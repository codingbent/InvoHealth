const mongoose = require("mongoose");
const { Schema } = mongoose;
const StaffSchema = new Schema(
    {
        name: { type: String, required: true },
        phone: { type: String, required: true, unique: true },

        role: {
            type: String,
            enum: ["receptionist", "assistant", "nurse"],
            required: true,
        },

        doctorId: {
            type: Schema.Types.ObjectId,
            ref: "Doc",
            required: true,
        },

        password: {
            type: String,     // bcrypt hash
            default: null,    // 👈 important
        },

        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Staff", StaffSchema);