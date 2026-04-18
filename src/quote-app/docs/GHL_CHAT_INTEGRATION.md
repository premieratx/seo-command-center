# Go High Level (GHL) Live Chat Integration Instructions

## Overview
Two-way integration between the PPC Live Chat widget and GHL Conversations, allowing agents to reply from GHL and have responses appear in the visitor's chat widget in real-time.

---

## Step 1: Set the GHL Webhook URL in Supabase Secrets

Add a secret called `GHL_WEBHOOK_URL` with the value of your GHL Inbound Webhook URL.

This is where visitor messages get forwarded TO GHL.

---

## Step 2: Create a GHL Workflow (Inbound — Visitor → GHL)

1. Go to **GHL → Automation → Workflows → Create Workflow**
2. Add trigger: **Inbound Webhook**
3. Copy the webhook URL GHL gives you — this becomes your `GHL_WEBHOOK_URL` secret in Supabase
4. The payload sent to GHL includes:
   ```json
   {
     "type": "live_chat_message",
     "visitorId": "...",
     "conversationId": "...",
     "message": "visitor's message text",
     "visitorName": "...",
     "visitorEmail": "...",
     "visitorPhone": "...",
     "domain": "...",
     "pageUrl": "...",
     "ip": "...",
     "replyWebhookUrl": "https://tgambsdjfwgoohkqopns.supabase.co/functions/v1/ghl-chat-webhook"
   }
   ```
5. In the workflow, map these fields to GHL contact fields and create/update a conversation

---

## Step 3: Set Up Reply Webhook (Outbound — GHL → Chat Widget)

1. Go to **GHL → Settings → Webhooks** (or use a Workflow with "Send Webhook" action)
2. Add an outbound webhook triggered when an **agent sends a message** in GHL Conversations
3. Point it to:
   ```
   https://tgambsdjfwgoohkqopns.supabase.co/functions/v1/ghl-chat-webhook
   ```
4. The webhook expects a JSON payload with any of these fields:
   - `message` / `body` / `text` / `content` — the reply text (required)
   - `conversationId` / `conversation_id` — our internal conversation UUID (preferred for matching)
   - `email` / `contact.email` — visitor email (fallback matching)
   - `phone` / `contact.phone` — visitor phone (fallback matching)
   - `visitorId` / `visitor_id` — visitor ID (fallback matching)
   - `name` / `contact.name` — agent name (optional, defaults to "GHL Agent")

---

## Step 4: Test the Integration

1. Open the live chat widget on any page
2. Send a message as a visitor
3. Verify it appears in GHL as a new conversation/contact
4. Reply from GHL
5. Verify the reply appears in the visitor's chat widget

---

## Edge Functions Involved

- `supabase/functions/chat-widget-messages/index.ts` — Handles visitor messages, forwards to GHL
- `supabase/functions/ghl-chat-webhook/index.ts` — Receives GHL agent replies, inserts into chat

---

## Matching Logic (GHL → Chat)

The inbound webhook matches GHL replies to existing conversations in this priority order:
1. `conversationId` (direct match — most reliable)
2. `visitor_email` (finds most recent active conversation)
3. `visitor_phone` (fallback)
4. `visitorId` (last resort)

---

## Notes
- The `replyWebhookUrl` is included in every outbound payload so GHL workflows can dynamically reference it
- All messages from GHL are inserted with `sender_type: 'admin'`
- Conversation metadata (last_message_at, preview) is updated on both sides
