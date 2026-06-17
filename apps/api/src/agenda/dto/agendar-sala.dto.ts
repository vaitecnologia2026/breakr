import { IsDateString, IsString, MaxLength, MinLength } from 'class-validator';

export class AgendarSalaDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  titulo!: string;

  @IsDateString()
  inicio!: string;

  @IsDateString()
  fim!: string;
}
