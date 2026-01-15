// ═══════════════════════════════════════════════════════════════════════
// WEBHOOK DELIVERY ENTITY
// ═══════════════════════════════════════════════════════════════════════

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { WebhookEvent } from "./webhook-event.entity";
import { WebhookSubscription } from "./webhook-subscription.entity";

export enum DeliveryStatus {
  PENDING = "pending",
  SUCCESS = "success",
  FAILED = "failed",
  RETRYING = "retrying",
}

@Entity("webhook_deliveries")
export class WebhookDelivery {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid")
  event_id: string;

  @Column("uuid")
  subscription_id: string;

  @Column({
    type: "varchar",
    length: 20,
    default: DeliveryStatus.PENDING,
  })
  status: DeliveryStatus;

  @Column({ default: 0 })
  attempt_count: number;

  @Column({ type: "timestamptz", nullable: true })
  last_attempt_at: Date;

  @Column({ type: "timestamptz", nullable: true })
  next_retry_at: Date;

  @Column({ type: "int", nullable: true })
  response_status: number;

  @Column({ type: "text", nullable: true })
  response_body: string;

  @Column({ type: "text", nullable: true })
  error_message: string;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: Date;

  @ManyToOne(() => WebhookEvent, { onDelete: "CASCADE" })
  @JoinColumn({ name: "event_id" })
  event: WebhookEvent;

  @ManyToOne(() => WebhookSubscription, { onDelete: "CASCADE" })
  @JoinColumn({ name: "subscription_id" })
  subscription: WebhookSubscription;
}
