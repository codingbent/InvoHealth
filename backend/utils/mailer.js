const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    pool: true,          // reuse SMTP connections instead of opening one per email
    maxConnections: 5,   // cap concurrent SMTP connections
    auth: {
        user: process.env.MAIL_USER,   
        pass: process.env.MAIL_PASS,
    },
});

transporter.verify((err) => {
    if (err) console.error("SMTP connection failed:", err.message);
});

module.exports = { transporter };