const SibApiV3Sdk = require("sib-api-v3-sdk");

const client = SibApiV3Sdk.ApiClient.instance;
client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;

const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

const transporter = {
    sendMail: async ({ to, subject, html }) => {
        await emailApi.sendTransacEmail({
            sender: { name: "InvoHealth", email: "invohealth.app@gmail.com" },
            to: [{ email: to }],
            subject,
            htmlContent: html,
        });
    },
};

module.exports = { transporter };
