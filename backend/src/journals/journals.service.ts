import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Journal, JournalType } from './entities/journal.entity';
import { GamificationState } from '../gamification/entities/gamification-state.entity';
import { AIGatewayService } from '../ai-gateway/ai-gateway.service';
import { CreateJournalDto } from './dto/create-journal.dto';

@Injectable()
export class JournalsService {
  private readonly logger = new Logger(JournalsService.name);

  constructor(
    @InjectRepository(Journal)
    private readonly journalRepository: Repository<Journal>,
    @InjectRepository(GamificationState)
    private readonly gamificationRepository: Repository<GamificationState>,
    private readonly aiGatewayService: AIGatewayService,
  ) {}

  async createEntry(userId: string, dto: CreateJournalDto) {
    const journal = this.journalRepository.create({
      userId,
      entryType: dto.entryType,
      moodRating: dto.moodRating,
      content: dto.content,
    });

    const savedJournal = await this.journalRepository.save(journal);

    // Trigger asynchronous AI analysis
    try {
      const prompt = `
        Analiza la siguiente entrada de diario personal.
        Extrae etiquetas (tags), arquetipos simbólicos y el análisis sentimental (positivo, neutral, negativo).
        Entrega la respuesta ESTRICTAMENTE en formato JSON plano sin bloques de código (sin markdown \`\`\`json) con el siguiente esquema:
        {
          "tags": ["tag1", "tag2"],
          "archetypes": ["arquetipo"],
          "sentiment": "positive|neutral|negative",
          "emotional_summary": "resumen en una frase en español e inglés."
        }

        Texto a analizar: "${dto.content}"
      `;

      const aiResponseText = await this.aiGatewayService.generateText(
        prompt,
        'journal_analysis',
        userId,
      );

      let parsedAnalysis = {};
      try {
        parsedAnalysis = JSON.parse(aiResponseText.replace(/```json/g, '').replace(/```/g, '').trim());
      } catch (parseErr) {
        this.logger.warn(`Failed to parse AI response as JSON: ${aiResponseText}. Using raw string.`);
        parsedAnalysis = { raw_ai_output: aiResponseText };
      }

      savedJournal.aiAnalysis = parsedAnalysis;
      await this.journalRepository.save(savedJournal);
    } catch (aiErr) {
      this.logger.error(`AI analysis failed for journal entry: ${aiErr.message}`);
    }

    // Update streaks and experience points
    const gamification = await this.updateGamificationState(userId);

    return {
      journal: savedJournal,
      gamification,
    };
  }

  async getEntries(userId: string) {
    return this.journalRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  private async updateGamificationState(userId: string) {
    let state = await this.gamificationRepository.findOne({ where: { userId } });
    if (!state) {
      state = this.gamificationRepository.create({ userId, streakDays: 0, totalPoints: 0, level: 1 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastActivity = state.lastActivityAt ? new Date(state.lastActivityAt) : null;
    if (lastActivity) {
      lastActivity.setHours(0, 0, 0, 0);
    }

    if (!lastActivity) {
      // First activity
      state.streakDays = 1;
    } else {
      const diffTime = today.getTime() - lastActivity.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Active streak continue!
        state.streakDays += 1;
      } else if (diffDays > 1) {
        // Streak lost, reset
        state.streakDays = 1;
      }
      // If diffDays === 0, user already posted today. Do not change streak.
    }

    state.lastActivityAt = today;
    state.totalPoints += 15; // award points for writing

    // Check level-up (+100 points per level threshold)
    const pointsThreshold = state.level * 100;
    if (state.totalPoints >= pointsThreshold) {
      state.level += 1;
      // Award badges if applicable
      const newBadge = `Level ${state.level} Scholar`;
      if (!state.unlockedBadges.includes(newBadge)) {
        state.unlockedBadges = [...state.unlockedBadges, newBadge];
      }
    }

    return this.gamificationRepository.save(state);
  }
}
