import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  Req,
} from '@nestjs/common';
import * as https from 'https';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../admin/admin.guard';
import { AIGatewayService } from './ai-gateway.service';

interface OpenAiProxyBody {
  model: string;
  messages: Array<{ role: string; content: string }>;
  apiKey: string;
  temperature?: number;
  max_tokens?: number;
}

/**
 * AiProxyController
 * Route: POST /api/v1/ai/proxy/openai
 *
 * Forwards chat-completion requests to OpenAI using the caller-supplied API key.
 * Protected by JwtAuthGuard — must be authenticated.
 */
@Controller('ai/proxy')
@UseGuards(JwtAuthGuard)
export class AiProxyController {
  private readonly logger = new Logger(AiProxyController.name);

  constructor(
    private readonly aiGatewayService: AIGatewayService,
  ) {}

  /** GET /api/v1/ai/proxy/settings */
  @Get('settings')
  async getSettings(@Req() req: any): Promise<any> {
    const settings = await this.aiGatewayService.getSettings();
    if (req.user && req.user.role === 'admin') {
      return settings;
    }
    // For regular users, mask API keys
    return {
      ai_active_model: settings.ai_active_model || 'mock',
      openrouter_model: settings.openrouter_model,
    };
  }

  /** POST /api/v1/ai/proxy/settings */
  @Post('settings')
  @UseGuards(AdminGuard)
  async saveSettings(@Body() body: Record<string, string>): Promise<any> {
    await this.aiGatewayService.saveSettings(body);
    return { message: 'Settings saved successfully' };
  }

  /** POST /api/v1/ai/proxy/generate */
  @Post('generate')
  @HttpCode(HttpStatus.OK)
  async generateText(
    @Body() body: { prompt: string; agentKey: string },
    @Req() req: any
  ): Promise<any> {
    const { prompt, agentKey } = body;
    if (!prompt || !agentKey) {
      throw new BadRequestException('Fields "prompt" and "agentKey" are required.');
    }
    const userId = req.user?.id;
    const content = await this.aiGatewayService.generateText(prompt, agentKey, userId);
    return { content };
  }

  /** POST /api/v1/ai/proxy/openai */
  @Post('openai')
  @HttpCode(HttpStatus.OK)
  async proxyOpenAi(@Body() body: OpenAiProxyBody): Promise<any> {
    if (!body.apiKey) {
      const settings = await this.aiGatewayService.getSettings();
      body.apiKey = settings.openai_api_key;
    }
    if (!body.apiKey) {
      throw new BadRequestException('OpenAI API key is missing on the server settings.');
    }
    return this.executeRequest(body, 'api.openai.com', '/v1/chat/completions');
  }

  /** POST /api/v1/ai/proxy/groq */
  @Post('groq')
  @HttpCode(HttpStatus.OK)
  async proxyGroq(@Body() body: OpenAiProxyBody): Promise<any> {
    if (!body.apiKey) {
      const settings = await this.aiGatewayService.getSettings();
      body.apiKey = settings.groq_api_key;
    }
    if (!body.apiKey) {
      throw new BadRequestException('Groq API key is missing on the server settings.');
    }
    return this.executeRequest(body, 'api.groq.com', '/openai/v1/chat/completions');
  }

  /** POST /api/v1/ai/proxy/openrouter */
  @Post('openrouter')
  @HttpCode(HttpStatus.OK)
  async proxyOpenRouter(@Body() body: OpenAiProxyBody): Promise<any> {
    if (!body.apiKey) {
      const settings = await this.aiGatewayService.getSettings();
      body.apiKey = settings.openrouter_api_key;
    }
    if (!body.apiKey) {
      throw new BadRequestException('OpenRouter API key is missing on the server settings.');
    }
    return this.executeRequest(body, 'openrouter.ai', '/api/v1/chat/completions', {
      'HTTP-Referer': 'http://localhost:3001',
      'X-Title': 'Celesthyas App',
    });
  }

  private async executeRequest(
    body: OpenAiProxyBody,
    hostname: string,
    path: string,
    extraHeaders: Record<string, string> = {},
  ): Promise<any> {
    const { model, messages, apiKey, temperature, max_tokens } = body;

    if (!model || !messages || !apiKey) {
      throw new BadRequestException('Fields "model", "messages" and "apiKey" are required.');
    }

    const cleanApiKey = apiKey.replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, '');

    const requestPayload = JSON.stringify({
      model,
      messages,
      ...(temperature !== undefined ? { temperature } : {}),
      ...(max_tokens !== undefined ? { max_tokens } : {}),
    });

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

        res.on('data', (chunk: Buffer) => {
          data += chunk.toString();
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);

            if (parsed.error) {
              this.logger.warn(`API error from ${hostname}: ${JSON.stringify(parsed.error)}`);
              reject(
                new BadRequestException(
                  parsed.error.message ?? `${hostname} returned an error response.`,
                ),
              );
              return;
            }

            const content = parsed.choices?.[0]?.message?.content || '';
            resolve({ content });
          } catch (parseErr) {
            this.logger.error(`Failed to parse response from ${hostname}: ${data}`);
            reject(new InternalServerErrorException('Failed to parse response.'));
          }
        });
      });

      req.on('error', (err) => {
        this.logger.error(`HTTPS request to ${hostname} failed: ${err.message}`);
        reject(
          new InternalServerErrorException(`Request to ${hostname} failed: ${err.message}`),
        );
      });

      req.write(requestPayload);
      req.end();
    });
  }
}
