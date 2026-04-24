/* eslint-disable no-undef */
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const sig = req.headers['stripe-signature']

  let event

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).json({ error: 'Webhook signature verification failed' })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const customerEmail = session.customer_details?.email

        if (!customerEmail) {
          console.error('No customer email in checkout session')
          return res.status(400).json({ error: 'No customer email' })
        }

        // Determine tier based on amount
        const amount = session.amount_total
        let tier = 'free'

        if (amount === 499) {
          tier = 'monthly'
        } else if (amount === 4999) {
          tier = 'lifetime'
        }

        // Update supporter_tier in Supabase
        const { error } = await supabase
          .from('profiles')
          .update({ supporter_tier: tier })
          .eq('email', customerEmail)

        if (error) {
          console.error('Error updating supporter tier:', error)
          return res.status(500).json({ error: 'Failed to update supporter tier' })
        }

        console.log(`Updated supporter tier to ${tier} for ${customerEmail}`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const customerId = subscription.customer

        // Get customer email from Stripe
        const customer = await stripe.customers.retrieve(customerId)
        const customerEmail = customer.email

        if (!customerEmail) {
          console.error('No customer email for subscription deletion')
          return res.status(400).json({ error: 'No customer email' })
        }

        // Set tier back to free
        const { error } = await supabase
          .from('profiles')
          .update({ supporter_tier: 'free' })
          .eq('email', customerEmail)

        if (error) {
          console.error('Error resetting supporter tier:', error)
          return res.status(500).json({ error: 'Failed to reset supporter tier' })
        }

        console.log(`Reset supporter tier to free for ${customerEmail}`)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    res.status(200).json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    res.status(500).json({ error: error.message })
  }
}
