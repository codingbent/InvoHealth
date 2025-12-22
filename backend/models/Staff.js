const StaffSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    role: {
        type: String,
        enum: ["receptionist", "assistant", "nurse"],
        required: true,
    },
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Doc",
        required: true,
    },
});

module.exports = mongoose.model("Staff", StaffSchema);
