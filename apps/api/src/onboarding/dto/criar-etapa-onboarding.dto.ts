// DTO para adicionar um item personalizado ao checklist de onboarding (ex.: os
// agendamentos criados pela CS: "Agendar reuniao", "Agendar apresentacao da
// proposta comercial"). Titulo obrigatorio; descricao opcional.
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CriarEtapaOnboardingDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  titulo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descricao?: string;
}
