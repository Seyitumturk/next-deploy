import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = headers().get('stripe-signature') || '';

  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret!);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Make sure payment status is paid or doesn't require payment
      if (session.payment_status === 'paid' || session.payment_status === 'no_payment_required') {
        await handleSuccessfulPayment(session);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

async function handleSuccessfulPayment(session: Stripe.Checkout.Session) {
  // Connect to database
  await dbConnect();

  // Extract user ID and credits from metadata
  const { userId, credits } = session.metadata || {};

  if (!userId || !credits) {
    console.error('Missing userId or credits in session metadata');
    return;
  }

  // Find user and update credits
  const user = await User.findById(userId);
  
  if (!user) {
    console.error(`User not found: ${userId}`);
    return;
  }

  // Add the purchased credits to the user's balance
  const purchasedCredits = parseInt(credits);
  user.wordCountBalance += purchasedCredits;
  
  await user.save();
  
  console.log(`Credits updated for user ${userId}: +${purchasedCredits} credits`);
} 