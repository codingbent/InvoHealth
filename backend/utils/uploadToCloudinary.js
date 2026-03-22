const cloudinary = require("../routes/config/cloudinary");

const uploadToCloudinary = (fileBuffer) => {
    return new Promise((resolve, reject) => {
        cloudinary.uploader
            .upload_stream({ folder: "invohealth" }, (error, result) => {
                if (error) return reject(error);
                resolve(result);
            })
            .end(fileBuffer);
    });
};

module.exports = uploadToCloudinary;
