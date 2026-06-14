// DTO de criacao de squad.
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CriarSquadDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  nome!: string;
}
