// DTO de criacao de perfil de acesso.
import { IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CriarPerfilDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nome!: string;

  // Rotas (menus) liberadas para o perfil (ex.: "/comercial", "/meu-painel").
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  permissoes?: string[];
}
