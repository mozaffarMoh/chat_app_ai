import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export enum ConversationTypeDto {
  DIRECT = 'DIRECT',
  GROUP = 'GROUP',
}

export class CreateConversationDto {
  @IsEnum(ConversationTypeDto)
  type!: ConversationTypeDto;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  participantIds!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}
