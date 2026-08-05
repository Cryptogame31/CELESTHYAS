import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import * as https from 'https';
import { AiGatewayLog } from './entities/ai-log.entity';
import { SystemSetting } from './entities/system-setting.entity';

@Injectable()
export class AIGatewayService implements OnModuleInit {
  private readonly logger = new Logger(AIGatewayService.name);
  private genAI: GoogleGenerativeAI | null = null;
  private openai: OpenAI | null = null;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(AiGatewayLog)
    private readonly aiLogRepository: Repository<AiGatewayLog>,
    @InjectRepository(SystemSetting)
    private readonly systemSettingRepository: Repository<SystemSetting>,
  ) {}

  async onModuleInit() {
    await this.initializeClients();
  }

  private async initializeClients(): Promise<void> {
    try {
      const settings = await this.getSettings();
      const geminiKey = settings.gemini_api_key || this.configService.get<string>('GEMINI_API_KEY');
      const openaiKey = settings.openai_api_key || this.configService.get<string>('OPENAI_API_KEY');

      if (geminiKey && geminiKey !== 'your_gemini_api_key_here') {
        this.genAI = new GoogleGenerativeAI(geminiKey);
      } else {
        this.genAI = null;
      }

      if (openaiKey && openaiKey !== 'your_openai_api_key_here') {
        this.openai = new OpenAI({ apiKey: openaiKey });
      } else {
        this.openai = null;
      }
    } catch (e) {
      this.logger.error('Failed to initialize AI clients:', e);
    }
  }

  async getSettings(): Promise<Record<string, string>> {
    const dbSettings = await this.systemSettingRepository.find();
    const settings: Record<string, string> = {
      ai_active_model: 'mock',
      gemini_api_key: '',
      openai_api_key: '',
      groq_api_key: '',
      openrouter_api_key: '',
      openrouter_model: 'google/gemini-2.0-flash-exp:free',
      active_video_bg: 'https://vicflix.expandete.cloud/videoscelesthya/hero1.mp4',
    };
    dbSettings.forEach((s) => {
      settings[s.key] = s.value || '';
    });
    return settings;
  }

  async saveSettings(settings: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(settings)) {
      let setting = await this.systemSettingRepository.findOneBy({ key });
      if (!setting) {
        setting = this.systemSettingRepository.create({ key, value });
      } else {
        setting.value = value;
      }
      await this.systemSettingRepository.save(setting);
    }
    await this.initializeClients();
  }

  async generateText(
    prompt: string,
    featureTag: string,
    userId?: string,
  ): Promise<string> {
    const settings = await this.getSettings();
    const activeModel = settings.ai_active_model || 'mock';

    if (activeModel === 'mock') {
      const mockOutput = this.getMockResponse(featureTag, prompt);
      await this.logUsage(userId, 'system_fallback', 'mock-model', 0, 0, 0.0, featureTag);
      return mockOutput;
    }

    // 1. Gemini Models
    if (activeModel.startsWith('gemini')) {
      const geminiKey = settings.gemini_api_key || this.configService.get<string>('GEMINI_API_KEY');
      if (geminiKey) {
        try {
          this.logger.log(`Routing prompt to Gemini (${activeModel}) for feature: ${featureTag}`);
          const client = new GoogleGenerativeAI(geminiKey);
          const modelName = activeModel === 'gemini-3.5-flash' ? 'gemini-2.0-flash' : activeModel;
          const model = client.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(prompt);
          const text = result.response.text();
          
          const inputTokens = Math.ceil(prompt.length / 4);
          const outputTokens = Math.ceil(text.length / 4);
          const cost = (inputTokens * 0.075 + outputTokens * 0.30) / 1000000;
          await this.logUsage(userId, 'google', activeModel, inputTokens, outputTokens, cost, featureTag);
          return text;
        } catch (error) {
          this.logger.error(`Gemini call failed in generateText: ${error.message || error}`);
        }
      }
    }

    // 2. OpenAI Models
    if (activeModel.startsWith('openai')) {
      const openaiKey = settings.openai_api_key || this.configService.get<string>('OPENAI_API_KEY');
      if (openaiKey) {
        try {
          this.logger.log(`Routing prompt to OpenAI (${activeModel}) for feature: ${featureTag}`);
          const client = new OpenAI({ apiKey: openaiKey });
          const modelName = activeModel.replace('openai/', '');
          const response = await client.chat.completions.create({
            model: modelName || 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
          });
          const text = response.choices[0].message.content || '';
          
          const inputTokens = response.usage?.prompt_tokens || Math.ceil(prompt.length / 4);
          const outputTokens = response.usage?.completion_tokens || Math.ceil(text.length / 4);
          const cost = (inputTokens * 0.150 + outputTokens * 0.60) / 1000000;
          await this.logUsage(userId, 'openai', activeModel, inputTokens, outputTokens, cost, featureTag);
          return text;
        } catch (error) {
          this.logger.error(`OpenAI call failed in generateText: ${error.message || error}`);
        }
      }
    }

    // 3. Groq Models
    if (activeModel.startsWith('groq')) {
      const groqKey = settings.groq_api_key || this.configService.get<string>('GROQ_API_KEY');
      if (groqKey) {
        try {
          this.logger.log(`Routing prompt to Groq (${activeModel}) for feature: ${featureTag}`);
          const modelName = activeModel.replace('groq/', '');
          const result = await this.callHttpsProxy('api.groq.com', '/openai/v1/chat/completions', groqKey, {
            model: modelName || 'llama-3.1-70b-versatile',
            messages: [{ role: 'user', content: prompt }]
          });
          if (result && result.content) {
            await this.logUsage(userId, 'groq', activeModel, 0, 0, 0.0, featureTag);
            return result.content;
          }
        } catch (error) {
          this.logger.error(`Groq call failed in generateText: ${error.message || error}`);
        }
      }
    }

    // 4. OpenRouter Models
    if (activeModel.startsWith('openrouter')) {
      const orKey = settings.openrouter_api_key || this.configService.get<string>('OPENROUTER_API_KEY');
      if (orKey) {
        try {
          this.logger.log(`Routing prompt to OpenRouter (${activeModel}) for feature: ${featureTag}`);
          const orModel = settings.openrouter_model || 'google/gemini-2.0-flash-exp:free';
          const result = await this.callHttpsProxy('openrouter.ai', '/api/v1/chat/completions', orKey, {
            model: orModel,
            messages: [{ role: 'user', content: prompt }]
          }, {
            'HTTP-Referer': 'http://localhost:3001',
            'X-Title': 'Celesthyas App'
          });
          if (result && result.content) {
            await this.logUsage(userId, 'openrouter', orModel, 0, 0, 0.0, featureTag);
            return result.content;
          }
        } catch (error) {
          this.logger.error(`OpenRouter call failed in generateText: ${error.message || error}`);
        }
      }
    }

    this.logger.warn(`All AI routing options failed or key missing for active model: ${activeModel}. Fallback mock.`);
    const mockOutput = this.getMockResponse(featureTag, prompt);
    await this.logUsage(userId, 'system_fallback', 'mock-model', 0, 0, 0.0, featureTag);
    return mockOutput;
  }

  private async callHttpsProxy(
    hostname: string,
    path: string,
    apiKey: string,
    payload: any,
    extraHeaders: Record<string, string> = {}
  ): Promise<any> {
    const cleanApiKey = apiKey.replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, '');
    const requestPayload = JSON.stringify(payload);

    return new Promise((resolve, reject) => {
      const options: https.RequestOptions = {
        hostname,
        port: 443,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cleanApiKey}`,
          'Content-Length': Buffer.byteLength(requestPayload),
          ...extraHeaders,
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              reject(new Error(parsed.error.message || 'API error'));
              return;
            }
            const content = parsed.choices?.[0]?.message?.content || '';
            resolve({ content });
          } catch (e) {
            reject(new Error('Parse error: ' + data));
          }
        });
      });

      req.on('error', (err) => { reject(err); });
      req.write(requestPayload);
      req.end();
    });
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
