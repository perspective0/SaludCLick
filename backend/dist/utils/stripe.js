"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStripeCustomer = createStripeCustomer;
exports.createDoctorSubscription = createDoctorSubscription;
const stripe_1 = __importDefault(require("stripe"));
const stripeSecret = process.env.STRIPE_SECRET_KEY;
const doctorPriceId = process.env.STRIPE_DOCTOR_PRICE_ID || process.env.STRIPE_PRICE_ID;
const stripe = stripeSecret ? new stripe_1.default(stripeSecret, { apiVersion: '2022-11-15' }) : null;
async function createStripeCustomer(email, name) {
    if (!stripe)
        return null;
    return stripe.customers.create({
        email,
        name,
    });
}
async function createDoctorSubscription(customerId) {
    if (!stripe || !doctorPriceId)
        return null;
    return stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: doctorPriceId }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
    });
}
//# sourceMappingURL=stripe.js.map