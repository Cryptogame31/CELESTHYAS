import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { AiGatewayLog } from './entities/ai-log.entity';

@Injectable()
export class AIGatewayService {
  private readonly logger = new Logger(AIGatewayService.name);
  private genAI: GoogleGenerativeAI | null = null;
  private openai: OpenAI | null = null;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(AiGatewayLog)
    private readonly aiLogRepository: Repository<AiGatewayLog>,
  ) {
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');
    const openaiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (geminiKey && geminiKey !== 'your_gemini_api_key_here') {
      this.genAI = new GoogleGenerativeAI(geminiKey);
    } else {
      this.logger.warn('Gemini API key is missing or is using placeholder value.');
    }

    if (openaiKey && openaiKey !== 'your_openai_api_key_here') {
      this.openai = new OpenAI({ apiKey: openaiKey });
    } else {
      this.logger.warn('OpenAI API key is missing or is using placeholder value.');
    }
  }

  async generateText(
    prompt: string,
    featureTag: string,
    userId?: string,
  ): Promise<string> {
    // 1. Try Gemini (Primary)
    if (this.genAI) {
      try {
        this.logger.log(`Routing prompt to Gemini (Primary) for feature: ${featureTag}`);
        const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        // Calculate approximate tokens and log cost
        // Gemini 2.0 Flash cost: Input = $0.075 / 1M, Output = $0.30 / 1M
        const inputTokens = Math.ceil(prompt.length / 4);
        const outputTokens = Math.ceil(text.length / 4);
        const cost = (inputTokens * 0.075 + outputTokens * 0.30) / 1000000;

        await this.logUsage(userId, 'google', 'gemini-2.0-flash', inputTokens, outputTokens, cost, featureTag);
        return text;
      } catch (error) {
        this.logger.error(`Gemini failed: ${error.message || error}. Falling back to OpenAI...`);
      }
    }

    // 2. Try OpenAI (Fallback)
    if (this.openai) {
      try {
        this.logger.log(`Routing prompt to OpenAI (Fallback) for feature: ${featureTag}`);
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
        });

        const text = response.choices[0].message.content || '';
        const inputTokens = response.usage?.prompt_tokens || Math.ceil(prompt.length / 4);
        const outputTokens = response.usage?.completion_tokens || Math.ceil(text.length / 4);
        
        // GPT-4o-mini cost: Input = $0.150 / 1M, Output = $0.60 / 1M
        const cost = (inputTokens * 0.150 + outputTokens * 0.60) / 1000000;

        await this.logUsage(userId, 'openai', 'gpt-4o-mini', inputTokens, outputTokens, cost, featureTag);
        return text;
      } catch (error) {
        this.logger.error(`OpenAI failed: ${error.message || error}`);
      }
    }

    // 3. Fallback mock output for testing/debugging when no keys are available
    this.logger.warn('All AI models failed or API keys are missing. Serving mock fallback interpretation.');
    const mockOutput = this.getMockResponse(featureTag, prompt);
    await this.logUsage(userId, 'system_fallback', 'mock-model', 0, 0, 0.0, featureTag);
    return mockOutput;
  }

  private async logUsage(
    userId: string | undefined,
    provider: string,
    model: string,
    promptTokens: number,
    completionTokens: number,
    estimatedCost: number,
    featureTag: string,
  ): Promise<void> {
    try {
      const log = this.aiLogRepository.create({
        userId,
        provider,
        model,
        promptTokens,
        completionTokens,
        estimatedCost,
        featureTag,
      });
      await this.aiLogRepository.save(log);
    } catch (dbError) {
      this.logger.error(`Failed to save AI log: ${dbError.message}`);
    }
  }

  private getMockResponse(featureTag: string, prompt: string): string {
    if (featureTag === 'tarot') {
      return `### 🔮 Tu Lectura de Tarot Mística

**Resumen del Cosmos:** Un camino de autodescubrimiento y superación espiritual.

#### 💫 Cartas Extraídas:
1. 🧙 **El Mago (Pasado):** Representa tu capacidad de manifestación y el enfoque que tuviste para iniciar este ciclo.
2. 🌟 **El Loco (Presente):** Simboliza nuevos comienzos, inocencia y la libertad de dar un salto de fe en tu situación actual.
3. 👹 **El Diablo (Futuro):** Te advierte sobre la necesidad de superar apegos materiales, miedos o dependencias que frenan tu evolución.

**Consejo del Universo:** Confía plenamente en tus habilidades y da el salto de fe con cautela. Tienes las herramientas necesarias dentro de ti.`;
    }

    if (featureTag === 'journal_analysis') {
      return `### 📝 Análisis Místico de tu Diario

**Resumen Emocional:** Muestras confianza, paz y optimismo sobre tu futuro cercano.

* **Arquetipo Espiritual:** El Explorador Cósmico.
* **Energías Activas:** Crecimiento, tiempo y reflexión.
* **Tono de Vibración:** Positivo y de transmutación.`;
    }

    return "Este es un mensaje de reflexión espiritual simulado de Celesthyas. Recuerda que la sabiduría reside en tu interior.";
  }
}
