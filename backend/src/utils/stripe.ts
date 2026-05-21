import Stripe from 'stripe';

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const doctorPriceId = process.env.STRIPE_DOCTOR_PRICE_ID || process.env.STRIPE_PRICE_ID;

const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: '2022-11-15' }) : null;

export async function createStripeCustomer(email: string, name?: string) {
  if (!stripe) return null;
  return stripe.customers.create({
    email,
    name,
  });
}

export async function createDoctorSubscription(customerId: string) {
  if (!stripe || !doctorPriceId) return null;
  return stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: doctorPriceId }],
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
  });
}
