// Seed idempotente — Banco de perguntas do teste DISC em Português (BR).
// Formato do Breakr: cada pergunta tem um enunciado e 4 opções (escolha forçada),
// uma para cada dimensão D/I/S/C; o candidato escolhe a que mais se identifica e a
// dimensão da opção recebe +1 no scoring (ver disc.service.ts).
//
// Idempotente e NÃO destrutivo: casa a pergunta pelo enunciado. Se ainda não
// existir, cria; se já existir (pertence a este lote gerenciado), atualiza as
// opções para a versão canônica abaixo. NUNCA apaga perguntas nem toca em
// perguntas de outros enunciados (ex.: criadas manualmente pelo admin). Seguro
// para rodar novamente.
//
// Rodar: npm run seed:disc --workspace @breakr/api

import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Dim = 'D' | 'I' | 'S' | 'C';

// Cada item traz o enunciado e um texto por dimensão. A ordem de exibição das
// opções é rotacionada por item (abaixo) para evitar viés de posição — o scoring
// não depende da ordem, apenas da dimensão de cada opção.
const ITENS: { enunciado: string; op: Record<Dim, string> }[] = [
  { enunciado: 'Ao iniciar um novo projeto, eu costumo:', op: {
    D: 'Assumir o comando e definir a direção rapidamente.',
    I: 'Engajar as pessoas e gerar entusiasmo pela ideia.',
    S: 'Garantir que todos estejam alinhados e confortáveis.',
    C: 'Planejar cada detalhe antes de começar.' } },
  { enunciado: 'Diante de uma decisão difícil, eu:', op: {
    D: 'Decido rápido e sigo em frente.',
    I: 'Converso com pessoas para sentir o clima.',
    S: 'Prefiro ponderar com calma, sem pressa.',
    C: 'Analiso os dados e as consequências.' } },
  { enunciado: 'No trabalho em equipe, meu papel natural é:', op: {
    D: 'Liderar e cobrar resultados.',
    I: 'Motivar e conectar o grupo.',
    S: 'Apoiar os colegas e manter a harmonia.',
    C: 'Organizar e garantir a qualidade.' } },
  { enunciado: 'Quando surge um conflito, eu tendo a:', op: {
    D: 'Enfrentar diretamente para resolver logo.',
    I: 'Usar o diálogo e o bom humor para aliviar.',
    S: 'Buscar consenso e evitar o embate.',
    C: 'Analisar os fatos antes de me posicionar.' } },
  { enunciado: 'Em relação a mudanças, eu:', op: {
    D: 'Gosto de provocá-las para avançar.',
    I: 'Me empolgo com as novidades.',
    S: 'Prefiro estabilidade e mudanças graduais.',
    C: 'Quero entender bem antes de aceitar.' } },
  { enunciado: 'Meu ambiente de trabalho ideal é:', op: {
    D: 'Dinâmico e desafiador.',
    I: 'Social e cheio de interação.',
    S: 'Estável e previsível.',
    C: 'Organizado e com regras claras.' } },
  { enunciado: 'As pessoas costumam me descrever como:', op: {
    D: 'Determinado(a) e objetivo(a).',
    I: 'Comunicativo(a) e entusiasmado(a).',
    S: 'Paciente e confiável.',
    C: 'Detalhista e cuidadoso(a).' } },
  { enunciado: 'Sob pressão, eu:', op: {
    D: 'Tomo a frente e ajo.',
    I: 'Mantenho o otimismo e engajo as pessoas.',
    S: 'Mantenho a calma e a constância.',
    C: 'Reviso tudo para não errar.' } },
  { enunciado: 'O que mais me motiva é:', op: {
    D: 'Alcançar metas e vencer desafios.',
    I: 'Reconhecimento e boas relações.',
    S: 'Segurança e um time unido.',
    C: 'Fazer um trabalho preciso e correto.' } },
  { enunciado: 'Ao me comunicar, eu sou:', op: {
    D: 'Direto(a) e objetivo(a).',
    I: 'Expressivo(a) e envolvente.',
    S: 'Calmo(a) e bom(boa) ouvinte.',
    C: 'Claro(a) e baseado(a) em fatos.' } },
  { enunciado: 'Diante de riscos, eu:', op: {
    D: 'Assumo se a recompensa valer a pena.',
    I: 'Encaro com otimismo.',
    S: 'Prefiro segurança e evito me arriscar.',
    C: 'Avalio cuidadosamente antes de agir.' } },
  { enunciado: 'Minha forma de organizar tarefas é:', op: {
    D: 'Focar no que traz resultado rápido.',
    I: 'Depende do meu ânimo e das pessoas envolvidas.',
    S: 'Seguir uma rotina constante.',
    C: 'Planejar em detalhes e por prioridade.' } },
  { enunciado: 'Em reuniões, eu geralmente:', op: {
    D: 'Conduzo e busco decisões.',
    I: 'Participo ativamente e trago energia.',
    S: 'Escuto e colaboro quando necessário.',
    C: 'Analiso e aponto pontos técnicos.' } },
  { enunciado: 'Ao aprender algo novo, prefiro:', op: {
    D: 'Ir direto à prática e aos resultados.',
    I: 'Aprender interagindo com outras pessoas.',
    S: 'Seguir um passo a passo com calma.',
    C: 'Estudar a fundo antes de aplicar.' } },
  { enunciado: 'Meu maior ponto forte é:', op: {
    D: 'A iniciativa.',
    I: 'O relacionamento.',
    S: 'A confiabilidade.',
    C: 'A precisão.' } },
  { enunciado: 'Quando algo dá errado, eu:', op: {
    D: 'Assumo a responsabilidade e corrijo rápido.',
    I: 'Mantenho o grupo motivado.',
    S: 'Mantenho a estabilidade e apoio o time.',
    C: 'Investigo a causa em detalhe.' } },
  { enunciado: 'Prefiro tarefas que sejam:', op: {
    D: 'Desafiadoras e com autonomia.',
    I: 'Colaborativas e criativas.',
    S: 'Bem definidas e estáveis.',
    C: 'Estruturadas e minuciosas.' } },
  { enunciado: 'Ao definir metas, eu:', op: {
    D: 'Estabeleço objetivos ambiciosos.',
    I: 'Envolvo as pessoas na visão.',
    S: 'Prefiro metas realistas e sustentáveis.',
    C: 'Baseio em dados e planejamento.' } },
  { enunciado: 'Meu ritmo costuma ser:', op: {
    D: 'Rápido e decidido.',
    I: 'Animado e espontâneo.',
    S: 'Constante e tranquilo.',
    C: 'Metódico e cuidadoso.' } },
  { enunciado: 'Eu valorizo mais:', op: {
    D: 'Resultados.',
    I: 'Relacionamentos.',
    S: 'Harmonia.',
    C: 'Qualidade.' } },
  { enunciado: 'Ao receber feedback, prefiro que seja:', op: {
    D: 'Direto e objetivo.',
    I: 'Encorajador e positivo.',
    S: 'Gentil e respeitoso.',
    C: 'Detalhado e fundamentado.' } },
  { enunciado: 'Em um grupo novo, eu:', op: {
    D: 'Assumo naturalmente a liderança.',
    I: 'Faço amizade com facilidade.',
    S: 'Observo e me integro aos poucos.',
    C: 'Analiso o ambiente antes de me expor.' } },
  { enunciado: 'Diante de prazos apertados, eu:', op: {
    D: 'Acelero e priorizo o essencial.',
    I: 'Mobilizo pessoas para ajudar.',
    S: 'Mantenho a firmeza e o ritmo constante.',
    C: 'Reviso para garantir que está correto.' } },
  { enunciado: 'O que mais me incomoda é:', op: {
    D: 'Lentidão e falta de decisão.',
    I: 'Ambientes frios e sem interação.',
    S: 'Mudanças bruscas e imprevisíveis.',
    C: 'Desorganização e imprecisão.' } },
];

// Rotação determinística da ordem das opções por item (evita viés de posição).
const ROT: Dim[] = ['D', 'I', 'S', 'C'];

async function main() {
  let criadas = 0;
  let atualizadas = 0;

  for (let i = 0; i < ITENS.length; i++) {
    const item = ITENS[i];
    const inicio = i % 4;
    const ordemDim = [0, 1, 2, 3].map((k) => ROT[(inicio + k) % 4]);
    const opcoes = ordemDim.map((d) => ({ texto: item.op[d], dimensao: d }));

    const ja = await prisma.discPergunta.findFirst({ where: { enunciado: item.enunciado } });
    if (ja) {
      await prisma.discPergunta.update({
        where: { id: ja.id },
        data: {
          ordem: i + 1,
          ativo: true,
          opcoes: opcoes as unknown as Prisma.InputJsonValue,
        },
      });
      atualizadas++;
      continue;
    }

    await prisma.discPergunta.create({
      data: {
        ordem: i + 1,
        ativo: true,
        enunciado: item.enunciado,
        opcoes: opcoes as unknown as Prisma.InputJsonValue,
      },
    });
    criadas++;
  }

  console.log(`[seed:disc] Perguntas PT-BR — criadas: ${criadas}, atualizadas: ${atualizadas}, total no lote: ${ITENS.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
