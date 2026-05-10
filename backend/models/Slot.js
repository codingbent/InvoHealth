const mongoose = require("mongoose");
const { Schema } = mongoose;

const SlotSchema = new Schema(
    {
        doctor: {
            type: Schema.Types.ObjectId,
            ref: "Doc",
            required: true,
        },

        date: {
            type: String,
            required: true,
            match: /^\d{4}-\d{2}-\d{2}$/,
        },

        time: {
            type: String,
            required: true,
        },

        visitId: {
            type: Schema.Types.ObjectId,
            default: null,
        },
    },
    { timestamps: true },
);

// Prevent duplicate slot booking
SlotSchema.index({ doctor: 1, date: 1, time: 1 }, { unique: true });

// Used by edit/delete flows
SlotSchema.index({ visitId: 1 });

SlotSchema.statics.normalizeDate = function (date) {
    if (typeof date !== "string") {
        throw new Error("Date must be a string");
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error("Invalid date format");
    }

    return date;
};

SlotSchema.statics.claim = async function (
    doctorId,
    date,
    time,
    session = null,
) {
    const dateKey = this.normalizeDate(date);

    return this.create(
        [
            {
                doctor: doctorId,
                date: dateKey,
                time,
            },
        ],
        session ? { session } : {},
    ).then((docs) => docs[0]);
};

SlotSchema.statics.release = async function (
    doctorId,
    date,
    time,
    session = null,
) {
    const dateKey = this.normalizeDate(date);

    return this.deleteOne(
        {
            doctor: doctorId,
            date: dateKey,
            time,
        },
        session ? { session } : {},
    );
};

SlotSchema.statics.swap = async function (
    doctorId,
    oldSlot,
    newSlot,
    session = null,
) {
    const oldKey = this.normalizeDate(oldSlot.date);
    const newKey = this.normalizeDate(newSlot.date);

    // no-op if the slot has not actually changed
    if (oldKey === newKey && oldSlot.time === newSlot.time) {
        return null;
    }

    const claimed = await this.create(
        [
            {
                doctor: doctorId,
                date: newKey,
                time: newSlot.time,
            },
        ],
        session ? { session } : {},
    ).then((docs) => docs[0]);

    await this.deleteOne(
        {
            doctor: doctorId,
            date: oldKey,
            time: oldSlot.time,
        },
        session ? { session } : {},
    );

    return claimed;
};

const Slot = mongoose.model("Slot", SlotSchema);

module.exports = Slot;
