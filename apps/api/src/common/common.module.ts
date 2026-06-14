import { Global, Module } from '@nestjs/common';
import { CodigoUnicoService } from './codigo-unico/codigo-unico.service';
import { CargosGuard } from './rbac/cargos.guard';

/**
 * Modulo transversal (Global): utilitarios disponiveis em todo o sistema
 * sem reimportar — gerador de codigo unico e guard de RBAC por cargo.
 */
@Global()
@Module({
  providers: [CodigoUnicoService, CargosGuard],
  exports: [CodigoUnicoService, CargosGuard],
})
export class CommonModule {}
