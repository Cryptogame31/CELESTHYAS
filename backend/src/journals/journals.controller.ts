import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { JournalsService } from './journals.service';
import { CreateJournalDto } from './dto/create-journal.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('journals')
@UseGuards(JwtAuthGuard)
export class JournalsController {
  constructor(private readonly journalsService: JournalsService) {}

  @Post()
  async createEntry(@Request() req, @Body() createJournalDto: CreateJournalDto) {
    return this.journalsService.createEntry(req.user.id, createJournalDto);
  }

  @Get()
  async getEntries(@Request() req) {
    return this.journalsService.getEntries(req.user.id);
  }
}
