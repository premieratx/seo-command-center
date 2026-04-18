# Stripe Payment & Installment Management Guide

## Overview
Your payment system now supports:
- **4-payment installment plans** (25% deposit + 3 equal payments)
- **Weekly $50 payment plans** (6 weekly $50 payments + remainder)
- **Automatic charging** on due dates
- **Full admin controls** to manage, modify, and manually charge

---

## How Autopay Works

### When a customer selects a payment plan:
1. **Initial payment is collected** via Stripe Checkout
2. **Installment records are created** in the database with due dates
3. **Payment method is saved** to the customer's Stripe account
4. **On each due date**, the system automatically charges the saved payment method

### Automatic Charging Schedule:
- **Daily at 12:00 PM CT**: The `process-due-installments` function runs automatically
- Charges all installments with `due_date` <= today
- Sends notifications for failed payments
- Updates installment status to 'paid' or 'failed'

---

## Monitoring Payments

### 1. **In Your Admin Dashboard**
**Go to: Admin → Installments Tab**

You'll see:
- **All installments** with customer info, amounts, due dates
- **Status badges**: Pending, Paid, Failed, Canceled
- **Event dates**: When the cruise is scheduled
- **Action buttons**: Charge Now, Cancel, Retry

**"Process Due Now" button**: Manually trigger charging of all due installments right now (doesn't wait for automatic schedule)

### 2. **In Stripe Dashboard**
**Go to: [https://dashboard.stripe.com/payments](https://dashboard.stripe.com/payments)**

Filter by:
- **Status**: succeeded, failed, pending
- **Customer**: search by name or email
- **Date range**: when payments were processed

**For each payment you can:**
- View full transaction details
- Issue refunds
- See payment method used
- Download receipts

**Installment metadata includes:**
- `booking_id`: Links payment to the cruise booking
- `installment_id`: Links to the installment record
- `installment_number`: Which installment (1, 2, 3, 4, etc.)

---

## Managing Installments

### Manual Charging
**When to use**: Customer requests immediate charge, or automatic charge failed

1. Go to **Admin → Installments**
2. Find the installment row
3. Click **"Charge Now"** button
4. System will:
   - Charge the saved payment method
   - Update status to 'paid'
   - Record the Stripe Payment Intent ID

### Canceling an Installment
**When to use**: Customer cancels booking, plan needs to be modified

1. Go to **Admin → Installments**
2. Find the installment row
3. Click the **X button** (red cancel button)
4. Confirm cancellation
5. Status changes to 'canceled' - won't be charged

### Handling Failed Payments
**When a payment fails:**
1. Installment status changes to 'failed'
2. Customer receives notification (via `send-failed-payment-notification`)
3. **You see "Payment failed" message** with **Retry button**
4. Options:
   - Click **Retry** to attempt charging again
   - Contact customer to update payment method
   - Cancel the installment if booking is canceled

---

## Modifying Payment Plans

### Option 1: Cancel and Recreate
**Best for**: Major plan changes, different payment schedule

1. **Cancel all pending installments** for the booking
2. Click **"Create Plan"** button
3. Enter:
   - **Booking ID**: UUID from bookings table
   - **Number of Installments**: 2-12
4. New plan will be created with evenly spaced due dates

### Option 2: Database Direct Edit
**Best for**: Adjusting a single installment amount or due date

1. Go to **Supabase Dashboard** → Table Editor
2. Find `payment_installments` table
3. Filter by `booking_id`
4. Edit:
   - `amount`: Change payment amount
   - `due_date`: Move the due date
   - `status`: Change from 'pending' to 'canceled'

**⚠️ Be careful**: Changing amounts won't update the total - just that installment

---

## Stripe Dashboard Quick Links

### Customers
**View all customers and payment methods:**
```
https://dashboard.stripe.com/customers
```

### Payment Methods
**See saved cards for a customer:**
1. Go to customer page
2. Click **"Payment methods"** tab
3. Add/remove cards as needed

### Failed Payments
**See all failed charges:**
```
https://dashboard.stripe.com/payments?status=failed
```

### Refunds
**Issue a refund:**
1. Find the payment in Stripe Dashboard
2. Click **"Refund"** button
3. Enter amount (full or partial)
4. Confirm

**⚠️ Important**: Refunding in Stripe does NOT update your database automatically. You'll need to manually update the installment status.

---

## Payment Plan Rules (14-Day Deadline)

### All payments MUST be completed 14 days before the cruise date

**For cruises booked >14 days out:**
- 4-payment plan: 25% deposit + 3 equal payments of 25% each
- Payments are evenly spaced between booking date and 14-day deadline
- Final payment is exactly 14 days before cruise

**For cruises booked ≤14 days out:**
- Only 2-payment option available
- 50% due immediately
- 50% due within 72 hours

**Weekly $50 plan:**
- $50 weekly for 6 weeks
- Remainder due 14 days before cruise
- Only available if there's enough time before the 14-day deadline

---

## Troubleshooting

### "No payment method found for customer"
**Solution**: Customer needs to complete initial Stripe Checkout to save payment method

### "Payment failed with status: requires_action"
**Solution**: 3D Secure authentication required - customer needs to complete manually

### "Installment is not pending"
**Solution**: Already charged or canceled - check status in database

### Autopay not running automatically
**Solution**: 
1. Check `process-due-installments` function logs in Supabase
2. Verify cron job is set up (see next section)

---

## Setting Up Automatic Charging (Cron Job)

### Option 1: Using Supabase Cron (Recommended)
Run this SQL in your Supabase SQL Editor:

\`\`\`sql
SELECT cron.schedule(
  'process-due-installments-daily',
  '0 12 * * *',  -- Every day at 12:00 PM
  $$
  SELECT
    net.http_post(
      url:='https://tgambsdjfwgoohkqopns.supabase.co/functions/v1/process-due-installments',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    ) AS request_id;
  $$
);
\`\`\`

Replace `YOUR_SERVICE_ROLE_KEY` with your actual service role key.

### Option 2: External Cron (e.g., cron-job.org)
1. Create free account at [cron-job.org](https://cron-job.org)
2. Create new cron job:
   - **URL**: `https://tgambsdjfwgoohkqopns.supabase.co/functions/v1/process-due-installments`
   - **Schedule**: Daily at 12:00 PM
   - **Method**: POST
   - **Headers**: Add `Authorization: Bearer YOUR_ANON_KEY`

---

## Best Practices

### ✅ DO:
- **Monitor failed payments daily** - follow up with customers quickly
- **Check installments tab regularly** - catch any issues early
- **Use Stripe Dashboard** for detailed transaction history
- **Test with Stripe test mode** before going live
- **Keep payment method info updated** - remind customers before due dates

### ❌ DON'T:
- **Don't modify bookings.amount** after installments are created
- **Don't delete installments** - cancel them instead (preserves history)
- **Don't manually edit Stripe** without updating your database
- **Don't skip the 14-day rule** - it's hardcoded for cruise prep time

---

## Need Help?

### Check Logs:
1. **Supabase Edge Function Logs**: See charge attempts and errors
2. **Stripe Dashboard Logs**: See all API requests and responses

### Common Issues:
- Payment fails → Check if card is expired or has insufficient funds
- No automatic charges → Verify cron job is running
- Amount discrepancy → Check if plan was modified after creation
