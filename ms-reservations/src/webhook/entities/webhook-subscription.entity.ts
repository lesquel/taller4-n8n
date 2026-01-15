// ═══════════════════════════════════════════════════════════════════════
// WEBHOOK SUBSCRIPTION ENTITY
// ═══════════════════════════════════════════════════════════════════════

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("webhook_subscriptions")
export class WebhookSubscription {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 500 })
  target_url: string;

  @Column({ length: 256 })
  secret: string;

  @Column("text", { array: true, default: "{}" })
  event_types: string[];

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at: Date;
}
