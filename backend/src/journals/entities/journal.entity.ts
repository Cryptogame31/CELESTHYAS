import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum JournalType {
  DREAM = 'dream',
  MOOD = 'mood',
  GRATITUDE = 'gratitude',
}

@Entity('journals')
export class Journal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.journals, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'simple-enum', enum: JournalType, name: 'entry_type' })
  entryType: JournalType;

  @Column({ name: 'mood_rating', nullable: true })
  moodRating: number;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ name: 'encrypted_content', type: 'text', nullable: true })
  encryptedContent: string;

  @Column({ type: 'jsonb', name: 'ai_analysis', nullable: true })
  aiAnalysis: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
