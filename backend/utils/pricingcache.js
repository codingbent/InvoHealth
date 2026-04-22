const Pricing = require("../models/Pricing");

let pricingCache = null;
let cacheTime = 0;

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function invalidatePricingCache() {
    pricingCache = null;
    cacheTime = 0;
}

async function getPricing() {
    if (pricingCache && Date.now() - cacheTime < CACHE_TTL) return pricingCache;

    pricingCache = await Pricing.findOne().lean();
    cacheTime = Date.now();
    return pricingCache;
}

module.exports = { getPricing, invalidatePricingCache };
