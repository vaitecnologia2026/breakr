// DTO de atualizacao de perfil de acesso (todos os campos opcionais).
import { IsArray, IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AtualizarPerfilDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nome?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  permissoes?: string[];

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
