const mongoose = require("mongoose");
const { Schema } = mongoose;
const StaffSchema = new Schema(
    {
        name: { type: String, required: true },
        phone: { type: String, required: true },

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
            type: String,
            default: null,
        },

        isActive: {
            type: Boolean,
            default: true,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true },
);

module.exports = mongoose.model("Staff", StaffSchema);
