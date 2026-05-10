function calculateBilling({ services, discount, isPercent, collected }) {
  const serviceTotal = services.reduce((sum, s) => sum + Number(s.amount), 0);
  const discountValue = Math.min(
    isPercent ? serviceTotal * (discount / 100) : discount,
    serviceTotal,
  );
  const finalAmount = serviceTotal - discountValue;
  const collectedAmount = Math.min(Math.max(collected, 0), finalAmount);
  const remainingAmount = finalAmount - collectedAmount;
  const paymentStatus =
    remainingAmount === 0 ? "Paid" : collectedAmount > 0 ? "Partial" : "Unpaid";
  return {
    serviceTotal,
    discountValue,
    finalAmount,
    collectedAmount,
    remainingAmount,
    paymentStatus,
  };
}

module.exports = calculateBilling;
