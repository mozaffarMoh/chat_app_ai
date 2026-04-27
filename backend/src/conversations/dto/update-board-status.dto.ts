import { IsEnum } from 'class-validator';
import { BoardStatus } from '../../../generated/prisma/index.js';

export class UpdateBoardStatusDto {
  @IsEnum(BoardStatus)
  boardStatus!: BoardStatus;
}
