import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, OneToOne } from 'typeorm';
import { Subscription } from '../../subscriptions/entities/subscription.entity';
import { Journal } from '../../journals/entities/journal.entity';
import { GamificationState } from '../../gamification/entities/gamification-state.entity';

export type UserRole = 'user' | 'admin';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'full_name', nullable: true })
  fullName: string;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate: Date;

  @Column({ name: 'birth_time', type: 'time', nullable: true })
  birthTime: string;

  @Column({ name: 'birth_place', nullable: true })
  birthPlace: string;

  @Column({
    type: 'simple-enum',
    enum: ['user', 'admin'],
    default: 'user',
  })
  role: UserRole;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Subscription, (sub) => sub.user)
  subscriptions: Subscription[];

  @OneToMany(() => Journal, (journal) => journal.user)
  journals: Journal[];

  @OneToOne(() => GamificationState, (state) => state.user)
  gamificationState: GamificationState;
}

