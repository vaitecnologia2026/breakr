import { SetMetadata } from '@nestjs/common';
import { Cargo } from '@breakr/shared';

export const CARGOS_KEY = 'cargos';

/**
 * Restringe uma rota aos cargos informados.
 * Use SEMPRE junto do JwtAuthGuard (que popula request.user):
 *   @UseGuards(JwtAuthGuard)            // no controller
 *   @UseGuards(CargosGuard) @Cargos(Cargo.ADMIN)  // no metodo
 */
export const Cargos = (...cargos: Cargo[]) => SetMetadata(CARGOS_KEY, cargos);
