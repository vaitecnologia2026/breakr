// DTO para vincular um usuario a um squad com uma funcao.
import { IsEnum, IsUUID } from 'class-validator';
import { Cargo } from '@breakr/shared';

export class AdicionarMembroDto {
  @IsUUID()
  usuarioId!: string;

  @IsEnum(Cargo)
  funcao!: Cargo;
}
