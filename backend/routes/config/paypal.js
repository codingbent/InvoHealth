const axios = require("axios");

const getPayPalAccessToken = async () => {
    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
        throw new Error("PayPal ENV vars missing");
    }

    const base =
        process.env.PAYPAL_MODE === "live"
            ? "https://api-m.paypal.com"
            : "https://api-m.sandbox.paypal.com";

    const auth = Buffer.from(
        `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`,
    ).toString("base64");

    try {
        const res = await axios.post(
            `${base}/v1/oauth2/token`,
            "grant_type=client_credentials",
            {
                headers: {
                    Authorization: `Basic ${auth}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            },
        );

        return { token: res.data.access_token, base };
    } catch (err) {
        console.error(
            "PayPal token error:",
            err.response?.data || err.message,
        );
        throw new Error("Failed to get PayPal access token");
    }
};

module.exports = { getPayPalAccessToken };
