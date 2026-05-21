import Stripe from 'stripe';
export declare function createStripeCustomer(email: string, name?: string): Promise<Stripe.Response<Stripe.Customer> | null>;
export declare function createDoctorSubscription(customerId: string): Promise<Stripe.Response<Stripe.Subscription> | null>;
//# sourceMappingURL=stripe.d.ts.map