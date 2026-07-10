// DTO do "Cadastro Completo" (dados de captacao p/ contrato) — 1:1 com o negocio.
import { IsOptional, IsString } from 'class-validator';

export class SalvarCadastroContratoDto {
  @IsOptional() @IsString() razaoSocial?: string;
  @IsOptional() @IsString() nomeFantasia?: string;
  @IsOptional() @IsString() cnpj?: string;
  @IsOptional() @IsString() nomeSocio?: string;
  @IsOptional() @IsString() cpfSocio?: string;
  @IsOptional() @IsString() dataNascimentoSocio?: string;
  @IsOptional() @IsString() profissao?: string;
  @IsOptional() @IsString() nacionalidade?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() whatsappSocio?: string;
  @IsOptional() @IsString() whatsappFinanceiro?: string;
  @IsOptional() @IsString() cep?: string;
  @IsOptional() @IsString() endereco?: string;
  @IsOptional() @IsString() numero?: string;
  @IsOptional() @IsString() complemento?: string;
  @IsOptional() @IsString() bairro?: string;
  @IsOptional() @IsString() cidadeEstado?: string;
  @IsOptional() @IsString() inscricaoMunicipal?: string;
  @IsOptional() @IsString() inscricaoEstadual?: string;
}
