// Interpretação de perfil DISC (PT-BR) — descrição, pontos fortes e desafios de
// cada estilo simples (D/I/S/C) e das combinações primário+secundário. Aditivo:
// alimenta o resultado exibido ao candidato ao concluir o teste, SEM alterar o
// scoring nem o que é gravado em Candidato.perfilDisc. Conteúdo adaptado dos
// projetos de referência DISC analisados (descrições single + combinações).

export type DimensaoDisc = 'D' | 'I' | 'S' | 'C';

export interface PerfilDisc {
  titulo: string;
  descricao: string;
  pontosFortes: string;
  desafios: string;
}

// Estilos simples (dimensão predominante isolada).
const PERFIS_SINGLE: Record<DimensaoDisc, PerfilDisc> = {
  D: {
    titulo: 'Dominância (D)',
    descricao:
      'Você é um líder nato, movido por resultados e pela vontade de fazer as coisas acontecerem. É decidido, assertivo e confiante nas próprias capacidades. Prospera em ambientes desafiadores e não teme assumir riscos ou tomar decisões difíceis. Prefere a ação à análise, e as pessoas costumam recorrer a você quando escolhas rápidas e firmes são necessárias. Sua energia é direcionada a alcançar objetivos, e você tende a exigir o melhor de si e de quem está ao redor.',
    pontosFortes: 'Decisão, foco em resultados, resolução de problemas, automotivação, coragem para arriscar, visão.',
    desafios:
      'Pode ser visto como exigente, impaciente ou pouco sensível. Vale trabalhar a escuta das opiniões alheias, o incentivo à colaboração e o equilíbrio entre a determinação e a empatia com quem tem outro ritmo.',
  },
  I: {
    titulo: 'Influência (I)',
    descricao:
      'Você é entusiasta e otimista, com um dom natural para se conectar com as pessoas. É persuasivo, envolvente e brilha em ambientes sociais, onde pode compartilhar ideias e inspirar quem está por perto. As pessoas se sentem atraídas por sua energia e calor, o que faz de você um talento para networking e formação de equipes. Você enxerga o potencial dos outros e os encoraja a perseguir seus objetivos, destacando-se onde trabalho em equipe, colaboração e criatividade são valorizados.',
    pontosFortes: 'Persuasão, otimismo, entusiasmo, construção de relacionamentos, ótima comunicação, inspiração.',
    desafios:
      'Pode ser visto como falante demais ou disperso. Vale trabalhar o foco nos detalhes, o cumprimento dos compromissos e garantir que o entusiasmo não ofusque os passos práticos para alcançar as metas.',
  },
  S: {
    titulo: 'Estabilidade (S)',
    descricao:
      'Você é um membro de equipe confiável e acolhedor, que valoriza estabilidade, harmonia e relações duradouras. Traz calma e consistência a qualquer situação, oferecendo paciência e compreensão a quem está por perto. Tende a evitar conflitos, preferindo ambientes de cooperação e paz. Sua lealdade a amigos, familiares e colegas é inabalável, e você se destaca em papéis de apoio. É um ótimo ouvinte e, diante de um plano claro, executa com determinação — o tipo de pessoa com quem os outros sabem que podem contar.',
    pontosFortes: 'Paciência, lealdade, apoio, boa escuta, orientação para o time, confiabilidade.',
    desafios:
      'Pode evitar conflitos ou mudanças e precisar trabalhar a assertividade e a expressão das próprias necessidades. Às vezes hesita quando decisões rápidas são exigidas ou em ambientes muito competitivos.',
  },
  C: {
    titulo: 'Conformidade (C)',
    descricao:
      'Você é detalhista e analítico, com foco profundo em precisão, estrutura e qualidade. Tem orgulho de produzir um trabalho de alto padrão e costuma ser a pessoa procurada quando análise cuidadosa e raciocínio metódico são necessários. Sua abordagem é minuciosa, sem deixar pontas soltas, o que faz de você um excelente solucionador de problemas complexos. Seus padrões são altos, e seu compromisso com a excelência garante um trabalho sempre bem pensado e confiável.',
    pontosFortes: 'Análise, atenção aos detalhes, organização, método, alto padrão de qualidade.',
    desafios:
      'Pode ser visto como crítico ou perfeccionista demais. Vale trabalhar a adaptação a mudanças, a confiança em delegar em situações colaborativas e aceitar que nem tudo exige uma solução perfeita.',
  },
};

// Combinações primário+secundário (chave canônica na ordem D, I, S, C).
const PERFIS_COMBO: Record<string, PerfilDisc> = {
  DI: {
    titulo: 'Dominância + Influência (D/I)',
    descricao:
      'Você é um líder carismático e persuasivo que prospera em ambientes acelerados. É naturalmente assertivo e gosta de assumir o comando, ao mesmo tempo em que inspira e entusiasma quem está ao redor. Sua confiança permite influenciar com facilidade, e você costuma estar no centro da ação, conduzindo o time rumo a metas ambiciosas — especialmente sob pressão.',
    pontosFortes: 'Decisão, confiança, visão, inspiração, persuasão, energia.',
    desafios:
      'Pode ser percebido como impaciente ou assertivo demais, ter dificuldade para delegar e se distrair com novas oportunidades sem concluir as atuais.',
  },
  DC: {
    titulo: 'Dominância + Conformidade (D/C)',
    descricao:
      'Você é um líder estratégico e analítico que valoriza precisão e resultados. É movido a vencer e a estabelecer metas ambiciosas, mas também prioriza planejamento cuidadoso e execução rigorosa. Essa combinação de assertividade e atenção ao detalhe permite decisões bem fundamentadas, tornando você uma força relevante onde lógica e liderança são igualmente exigidas.',
    pontosFortes: 'Estratégia, decisão, análise, organização, foco em resultados, atenção ao detalhe.',
    desafios:
      'Seus padrões elevados podem soar críticos com os outros. Vale buscar equilíbrio entre a busca pela perfeição e o espaço para que os demais contribuam sem se sentirem microgerenciados.',
  },
  DS: {
    titulo: 'Dominância + Estabilidade (D/S)',
    descricao:
      'Você combina o impulso por resultados com firmeza e consistência. Assume a direção quando é preciso, mas o faz de forma constante e confiável, sem perder o senso de responsabilidade. Consegue conduzir tarefas até o fim mantendo estabilidade para a equipe, unindo determinação e perseverança.',
    pontosFortes: 'Determinação, consistência, confiabilidade, foco, perseverança.',
    desafios:
      'Pode oscilar entre a urgência de agir e a cautela de manter a estabilidade. Vale trabalhar a flexibilidade diante de mudanças e comunicar com clareza a direção que deseja imprimir.',
  },
  IS: {
    titulo: 'Influência + Estabilidade (I/S)',
    descricao:
      'Você é um membro de equipe caloroso e acolhedor, que promove colaboração e harmonia. É naturalmente empático e gosta de se conectar com as pessoas em nível pessoal. A combinação de sociabilidade e estabilidade faz de você um colega confiável — acessível e constante ao mesmo tempo —, destacando-se em ambientes que valorizam trabalho em equipe e apoio mútuo.',
    pontosFortes: 'Empatia, apoio, colaboração, paciência, boa escuta, construção de relações.',
    desafios:
      'A preferência por harmonia pode levar a evitar conflitos ou conversas difíceis. Aprender a se posicionar quando necessário garante que sua voz seja ouvida mesmo em decisões delicadas.',
  },
  IC: {
    titulo: 'Influência + Conformidade (I/C)',
    descricao:
      'Você une o entusiasmo social ao cuidado com a qualidade. Comunica-se com facilidade e gosta de engajar as pessoas, mas também preza por precisão e por fazer bem-feito. Essa combinação permite apresentar ideias de forma envolvente sem abrir mão do rigor, conectando criatividade e método.',
    pontosFortes: 'Comunicação, relacionamento, criatividade com método, cuidado com a qualidade.',
    desafios:
      'Pode viver a tensão entre a espontaneidade e a exigência de precisão. Vale equilibrar prazos e detalhes para que o zelo pela qualidade não trave o ritmo da entrega.',
  },
  SC: {
    titulo: 'Estabilidade + Conformidade (S/C)',
    descricao:
      'Você é uma pessoa confiável e metódica, que valoriza precisão, consistência e estabilidade. Aborda as tarefas com paciência e forte atenção ao detalhe, garantindo que tudo seja feito de forma correta e completa. Os outros apreciam seu jeito calmo e ponderado, que oferece firmeza mesmo em situações difíceis, e você é especialmente eficaz em planejamento de longo prazo.',
    pontosFortes: 'Confiabilidade, consistência, atenção ao detalhe, organização, paciência, método.',
    desafios:
      'Pode resistir a mudanças e ter dificuldade com decisões rápidas, sendo visto como cauteloso ou inflexível demais. Reconhecer quando flexibilidade é necessária ajuda a avançar, mesmo fora da zona de conforto.',
  },
};

// Ordem canônica das dimensões para montar a chave da combinação.
const ORDEM: Record<DimensaoDisc, number> = { D: 0, I: 1, S: 2, C: 3 };

/**
 * Interpreta o perfil a partir das dimensões predominantes.
 * - primario: dimensão de maior pontuação (obrigatória).
 * - secundario: segunda dimensão (opcional); quando presente e diferente,
 *   busca a combinação; senão, cai no estilo simples do primário.
 * Retorna null se não houver dimensão predominante.
 */
export function interpretarPerfil(
  primario: DimensaoDisc | null,
  secundario: DimensaoDisc | null,
): PerfilDisc | null {
  if (!primario) return null;
  if (secundario && secundario !== primario) {
    const chave = [primario, secundario].sort((a, b) => ORDEM[a] - ORDEM[b]).join('');
    if (PERFIS_COMBO[chave]) return PERFIS_COMBO[chave];
  }
  return PERFIS_SINGLE[primario];
}
