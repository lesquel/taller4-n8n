// ═══════════════════════════════════════════════════════════════════════
// WEBHOOK EVENT ENTITY
// ═══════════════════════════════════════════════════════════════════════

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity("webhook_events")
export class WebhookEvent {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 100 })
  event_type: string;

  @Column("jsonb")
  payload: Record<string, any>;

  @Column({ length: 256, unique: true })
  idempotency_key: string;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: Date;
}
