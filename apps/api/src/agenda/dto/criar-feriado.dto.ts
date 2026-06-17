import { IsDateString, IsString, MaxLength, MinLength } from 'class-validator';

export class CriarFeriadoDto {
  @IsDateString()
  data!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  titulo!: string;
}
