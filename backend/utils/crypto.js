const crypto = require("crypto");

const algorithm = "aes-256-cbc";

const secretKey = crypto
    .createHash("sha256")
    .update(process.env.CRYPTO_SECRET)
    .digest();

function encrypt(text) {
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    return iv.toString("hex") + ":" + encrypted;
}

function decrypt(hash) {
    const [ivHex, encryptedText] = hash.split(":");

    const decipher = crypto.createDecipheriv(
        algorithm,
        secretKey,
        Buffer.from(ivHex, "hex"),
    );

    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
}

module.exports = { encrypt, decrypt };
