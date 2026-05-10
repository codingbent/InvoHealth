const SibApiV3Sdk = require("sib-api-v3-sdk");

const client = SibApiV3Sdk.ApiClient.instance;
client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;

const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

const transporter = {
    sendMail: async ({ to, subject, html, attachments = [] }) => {
        const payload = {
            sender: { name: "InvoHealth", email: "invohealth.app@gmail.com" },
            to: [{ email: to }],
            subject,
            htmlContent: html,
        };

        if (attachments.length > 0) {
            payload.attachment = attachments.map((a) => ({
                name: a.filename,
                content: Buffer.isBuffer(a.content)
                    ? a.content.toString("base64")
                    : Buffer.from(a.content).toString("base64"),
            }));
        }

        await emailApi.sendTransacEmail(payload);
    },
};

module.exports = { transporter };
