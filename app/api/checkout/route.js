export const dynamic = 'force-dynamic';

import Stripe from "stripe";
import { NextResponse } from "next/server";


export async function POST(req) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_BASE_URL;
    const { amount, metadata, type } = await req.json();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: type === "donation"
                ? "Donation to Pangasinan Society of Calgary"
                : "PASOC Membership Registration",
              ...(metadata?.description ? { description: metadata.description } : {}),
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: { ...(metadata || {}), type: type },
      success_url: type === "donation"
        ? `${origin}/Donate?success=true&amount=${amount}`
        : `${origin}/success?type=${type}`,
      cancel_url: `${origin}/${type === "donation" ? "Donate?cancelled=true" : "login/membership"}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}