import { IsDateString } from 'class-validator';

export class MarcarHomeOfficeDto {
  @IsDateString()
  data!: string;
}
