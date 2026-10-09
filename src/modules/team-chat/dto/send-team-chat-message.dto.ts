import { IsOptional, IsUUID, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendTeamChatMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  content!: string;

  @IsOptional()
  @IsUUID()
  clientMessageId?: string;
}
