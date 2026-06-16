// Seed idempotente — Breakr OS (Fase 0)
// Cria o Config singleton e o usuario admin inicial.
// Rodar: npm run seed --workspace @breakr/api

import { PrismaClient, Cargo } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Config singleton usa um id fixo para garantir idempotencia (upsert).
const CONFIG_ID = '00000000-0000-0000-0000-000000000001';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@breakr.com';
// Sobrescreva com a variavel de ambiente ADMIN_SENHA no Railway antes do deploy.
const ADMIN_SENHA = process.env.ADMIN_SENHA ?? 'Breakr@OS2026';

async function main() {
  // 1) Config singleton (branding/parametros vazios na Fase 0).
  await prisma.config.upsert({
    where: { id: CONFIG_ID },
    update: {},
    create: {
      id: CONFIG_ID,
      branding: { nome: 'Breakr', corPrimaria: '#000000' },
      parametros: {},
    },
  });

  // 2) Usuario admin (idempotente por email unico).
  const senhaHash = await bcrypt.hash(ADMIN_SENHA, 10);
  const admin = await prisma.usuario.upsert({
    where: { email: ADMIN_EMAIL },
    update: { senhaHash },
    create: {
      nome: 'Admin Breakr',
      email: ADMIN_EMAIL,
      senhaHash,
      cargo: Cargo.ADMIN,
      ativo: true,
    },
  });

  console.log('[seed] Config singleton OK:', CONFIG_ID);
  console.log('[seed] Admin OK:', admin.email, '(senha:', ADMIN_SENHA + ')');
}

main()
  .catch((e) => {
    console.error('[seed] erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
