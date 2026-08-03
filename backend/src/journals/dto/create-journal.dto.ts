import { IsEnum, IsNotEmpty, IsInt, Min, Max, IsString } from 'class-validator';
import { JournalType } from '../entities/journal.entity';

export class CreateJournalDto {
  @IsEnum(JournalType, { message: 'El tipo de entrada no es válido / Entry type must be dream, mood or gratitude.' })
  @IsNotEmpty()
  entryType: JournalType;

  @IsInt()
  @Min(1)
  @Max(10)
  @IsNotEmpty()
  moodRating: number;

  @IsString()
  @IsNotEmpty()
  content: string;
}
