// ═══════════════════════════════════════════════════════════════════════
// WEBHOOK DTOs
// ═══════════════════════════════════════════════════════════════════════

export class WebhookPayloadDto {
  event_type: string;
  idempotency_key: string;
  timestamp: string;
  data: Record<string, any>;
}

export class WebhookDeliveryDto {
  subscription_id: string;
  target_url: string;
  payload: WebhookPayloadDto;
  signature: string;
}

export class WebhookSubscriptionDto {
  id: string;
  name: string;
  target_url: string;
  secret: string;
  event_types: string[];
  is_active: boolean;
}
