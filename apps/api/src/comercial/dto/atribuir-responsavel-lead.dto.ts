// DTO para atribuir um responsavel ao lead.
import { IsUUID } from 'class-validator';

export class AtribuirResponsavelLeadDto {
  @IsUUID()
  responsavelId!: string;
}
