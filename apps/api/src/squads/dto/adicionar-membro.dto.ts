// DTO para vincular um usuario a um squad com uma funcao.
import { IsEnum, IsUUID } from 'class-validator';
import { FuncaoSquad } from '@breakr/shared';

export class AdicionarMembroDto {
  @IsUUID()
  usuarioId!: string;

  @IsEnum(FuncaoSquad)
  funcao!: FuncaoSquad;
}
