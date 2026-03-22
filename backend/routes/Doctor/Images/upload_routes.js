const express = require("express");
const router = express.Router();

const upload = require("../../../middleware/upload");
const uploadToCloudinary = require("../../../utils/uploadToCloudinary");

router.post("/", upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "No file uploaded",
            });
        }

        const result = await uploadToCloudinary(req.file.buffer);

        res.status(200).json({
            url: result.secure_url,
            public_id: result.public_id,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Upload failed" });
    }
});

module.exports = router;
