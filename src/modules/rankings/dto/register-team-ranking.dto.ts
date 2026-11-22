import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

export class RegisterTeamRankingDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Length(2, 12)
  @Matches(/^[가-힣a-zA-Z0-9 _-]+$/)
  teamName!: string;
}
