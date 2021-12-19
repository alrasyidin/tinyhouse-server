import stripe from "stripe";

const client = new stripe(`${process.env.S_SECRET_KEY}`, {
  apiVersion: "2020-08-27",
});

export const Stripe = {
  connect: async (code: string) => {
    const response = await client.oauth.token({
      grant_type: "authorization_code",
      code,
    });

    if (!response) {
      throw new Error("Failed to connect with stripe.");
    }

    return response;
  },

  disconnect: async (stripeUserId: string) => {
    const response = await client.oauth.deauthorize({
      client_id: `${process.env.S_CLIENT_ID}`,
      stripe_user_id: stripeUserId,
    });

    return response;
  },

  async charge(price: number, source: string, stripeAccount: string) {
    const response = await client.charges.create(
      {
        currency: "usd",
        amount: price,
        source,
        application_fee_amount: Math.round(price * 0.05),
      },
      {
        stripeAccount,
      }
    );

    if (response.status !== "succeeded") {
      throw new Error("failed to create charge with stripe");
    }
  },
};
