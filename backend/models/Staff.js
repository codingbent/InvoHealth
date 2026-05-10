const mongoose = require("mongoose");
const { Schema } = mongoose;

const StaffSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        phoneEncrypted: {
            type: String,
            default: null,
            select: false,
        },

        phoneHash: {
            type: String,
            default: null,
            select: false,
        },

        phoneLast4: {
            type: String,
            default: null,
        },

        countryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Country",
        },

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
            select: false,
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        isDeleted: {
            type: Boolean,
            default: false,
        },
        canUploadImages: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true },
);

StaffSchema.index({ phoneLast4: 1 });

StaffSchema.index({
    doctorId: 1,
    isDeleted: 1,
    isActive: 1,
});

module.exports = mongoose.model("Staff", StaffSchema);
