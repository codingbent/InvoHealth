const cloudinary = require("../routes/config/cloudinary");
const streamifier = require("streamifier");

const uploadToCloudinary = (fileBuffer, mimetype) => {
    return new Promise((resolve, reject) => {
        const isPDF = mimetype === "application/pdf";

        const uploadOptions = {
            resource_type: isPDF ? "raw" : "image",
            folder: isPDF ? "invohealth/pdfs" : "invohealth/images",
            use_filename: true,
            unique_filename: true,
            type: "upload",
        };

        const stream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
                if (error) {
                    console.error("Cloudinary error:", error);
                    return reject(error);
                }
                resolve(result);
            },
        );

        const bufferStream = streamifier.createReadStream(fileBuffer);

        bufferStream.on("error", (err) => {
            console.error("Stream error:", err);
            reject(err);
        });

        bufferStream.pipe(stream);
    });
};

module.exports = uploadToCloudinary;
