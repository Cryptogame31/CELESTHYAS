import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('gamification_states')
export class GamificationState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @OneToOne(() => User, (user) => user.gamificationState, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'streak_days', default: 0 })
  streakDays: number;

  @Column({ name: 'last_activity_at', type: 'date', nullable: true })
  lastActivityAt: Date;

  @Column({ name: 'total_points', default: 0 })
  totalPoints: number;

  @Column({ default: 1 })
  level: number;

  @Column({ type: 'jsonb', name: 'unlocked_badges', default: [] })
  unlockedBadges: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
