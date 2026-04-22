const mongoose = require("mongoose");
const { Schema } = mongoose;

// SUB CATEGORY
const SubCategorySchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    categoryId: {
        type: Schema.Types.ObjectId,
        ref: "PaymentCategory",
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
});

// CATEGORY
const CategorySchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
});

// MODELS
const PaymentCategory = mongoose.model("PaymentCategory", CategorySchema);
const PaymentSubCategory = mongoose.model("PaymentSubCategory", SubCategorySchema);

module.exports = {
    PaymentCategory,
    PaymentSubCategory,
};