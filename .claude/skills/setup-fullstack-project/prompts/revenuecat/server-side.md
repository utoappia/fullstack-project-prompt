## Server-Side: REST API and Webhooks

### REST API

Base URL: `https://api.revenuecat.com/v1`
Auth: `Authorization: Bearer sk_your_secret_key`

Key endpoints:

| Method | Endpoint | Use |
|---|---|---|
| `GET` | `/subscribers/{app_user_id}` | Get subscriber info, entitlements, subscriptions |
| `POST` | `/receipts` | Validate a receipt server-side |
| `POST` | `/subscribers/{id}/entitlements/{eid}/promotional` | Grant a promotional entitlement (duration: daily, weekly, monthly, annual, lifetime) |
| `POST` | `/subscribers/{id}/entitlements/{eid}/revoke_promotionals` | Revoke all promotional entitlements |
| `POST` | `/subscribers/{id}/attributes` | Set custom subscriber attributes |
| `POST` | `/subscribers/{id}/subscriptions/{pid}/defer` | Defer Google subscription billing |
| `POST` | `/subscribers/{id}/subscriptions/{pid}/refund` | Refund Google Play subscription |
| `GET` | `/subscribers/{id}/offerings` | Get current offerings for subscriber |
| `DELETE` | `/subscribers/{app_user_id}` | Delete subscriber data (GDPR) |

Use the secret key (`sk_`) for all server-side calls. Never use it in client code.

### Webhooks

Configure in RevenueCat dashboard (Project Settings → Integrations → Webhooks). Your server receives POST requests for subscription events.

**Technical specs:**
- HTTP POST with JSON body
- Must respond with HTTP 200 within 60 seconds
- Configurable authorization header
- Environment filtering: production, sandbox, or both
- Event type filtering available
- Multiple webhook integrations per project supported

| Event | When it fires |
|---|---|
| `INITIAL_PURCHASE` | First purchase of a product |
| `RENEWAL` | Subscription renewed |
| `CANCELLATION` | User turned off auto-renew or was refunded |
| `UNCANCELLATION` | User re-enabled auto-renew before expiry |
| `EXPIRATION` | Subscription expired |
| `BILLING_ISSUE` | Payment failed (grace period may apply) |
| `PRODUCT_CHANGE` | User switched plans |
| `NON_RENEWING_PURCHASE` | One-time purchase |
| `SUBSCRIPTION_PAUSED` | Subscription paused (Google Play only) |
| `SUBSCRIPTION_EXTENDED` | Expiration date extended |
| `TRANSFER` | Purchase transferred between users |
| `REFUND_REVERSED` | Refund reversed (App Store only) |
| `TEMPORARY_ENTITLEMENT_GRANT` | Temp access during store outage |
| `EXPERIMENT_ENROLLMENT` | User enrolled in an experiment |
| `VIRTUAL_CURRENCY_TRANSACTION` | Virtual currency adjustment |

### Webhook lifecycle sequences

- **Trial → conversion:** `INITIAL_PURCHASE` (period_type: TRIAL) → `RENEWAL` (is_trial_conversion: true)
- **Trial → failure:** `INITIAL_PURCHASE` → `CANCELLATION` → `EXPIRATION`
- **Normal cancel:** `CANCELLATION` → `EXPIRATION` (at period end)
- **Re-subscribe:** `CANCELLATION` → `UNCANCELLATION` (before expiry)
- **Billing issue:** `BILLING_ISSUE` + `CANCELLATION` → `RENEWAL` (if recovered) or `EXPIRATION`
- **Plan change:** `PRODUCT_CHANGE` → `RENEWAL` with new product at period end

### Webhook handler example (Lambda or Vercel)

```typescript
export async function handler(params: { event: RevenueCatWebhookEvent }) {
  const { event } = params;

  // Verify authorization header matches your configured secret
  // Use event.id for idempotency (see idempotency.md)

  switch (event.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
      await activateUserPro(event.app_user_id, event.expiration_at_ms);
      break;
    case 'EXPIRATION':
    case 'CANCELLATION':
      await deactivateUserPro(event.app_user_id);
      break;
    case 'BILLING_ISSUE':
      await notifyBillingIssue(event.app_user_id);
      break;
  }

  return { statusCode: 200 };
}
```

### Webhook best practices

- Retries: 5 attempts at 5, 10, 20, 40, 80 minute intervals on non-2xx.
- Delivery: 5-60 seconds typical. Cancellation events may take ~2 hours. At-least-once delivery.
- Use `event.id` for idempotency — you may receive the same event multiple times.
- Check `event.environment` (`SANDBOX` or `PRODUCTION`) to distinguish test from real purchases.
- Key payload fields: `event.type`, `event.app_user_id`, `event.product_id`, `event.entitlement_ids`, `event.expiration_at_ms`, `event.price`, `event.currency`, `event.store`, `event.cancel_reason`, `event.is_trial_conversion`, `event.renewal_number`.
- Don't rely solely on webhooks — call `GET /v1/subscribers/{id}` after webhook for consistent data.
- Handle unknown event types gracefully — RevenueCat may add new types.
