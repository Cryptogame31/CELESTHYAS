import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('ai_gateway_logs')
export class AiGatewayLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  provider: string;

  @Column()
  model: string;

  @Column({ name: 'prompt_tokens' })
  promptTokens: number;

  @Column({ name: 'completion_tokens' })
  completionTokens: number;

  @Column({ name: 'estimated_cost', type: 'numeric', precision: 10, scale: 6 })
  estimatedCost: number;

  @Column({ name: 'feature_tag' })
  featureTag: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
