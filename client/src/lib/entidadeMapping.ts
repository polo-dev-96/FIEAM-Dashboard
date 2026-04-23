export type Entidade = "SENAI" | "SESI" | "IEL" | "Outros";

export type UnidadeSESI = "SESI ESCOLA" | "SESI CLUBE" | "SESI SAÚDE";

export type Equipe = string;

export interface EntidadeUnidade {
  entidade: Entidade | null;
  unidade?: UnidadeSESI;
}

// Casas que serão excluídas de "Outros" - não aparecerão em nenhum filtro
const EXCLUIDOS_OUTROS = new Set<string>([
  "Autoatendimento",
  "AUTOMÓVEIS",
  "Casa Homer",
  "ELETROTÉCNICA",
  "IEL",
  "INFORMÁTICA BÁSICA",
  "LABORATÓRIO",
  "NCR Brasil SÃ",
  "OPÇÃO CURSOS",
  "Polo Duas Rodas",
  "casa",
  "main",
  "Manaus",
  "Falta de Interação",
  "PF- SAC",
  "ALESSANDRA COSTA",
  "Teste IA",
  // Apenas os PJ 
  "ADM - PJ",
  "COMERCIAL - PJ",
  "PJ- B+P",
  "PJ- IEL",
  "Email comercial PJ",
  "PJ- ESCOLA SESI",
  "alexandra leste",
  "Gama",
  "PJ- SIPAT E EVENTOS",
  "PJ- VACINA DA GRIPE",
  "PJ-IEL",
  "SESI CLUBE",
  "SESI ODONTOLOGIA"
]);

// Mapeamento de renomeação de equipes em Outros
const RENOMEACAO_EQUIPES: Record<string, string> = {
  "ALESSANDRA COSTA": "ADM - PJ",
};

// Casas que devem aparecer como PF-IEL quando Entidade IEL é selecionada
const PF_IEL_CASAS = new Set<string>(["PF- IEL", "IEL"]);

// Casas que devem aparecer como PF-SENAI quando Entidade SENAI é selecionada
const PF_SENAI_CASAS = new Set<string>([
  "I.A Senai PF",
  "I.A SENAI PF",
  "PF-SENAI",
  "PF- SENAI",
  "SENAI",
]);

// Casas que devem aparecer como PF-SESI ESCOLA quando Entidade SESI é selecionada
const PF_SESI_ESCOLA_CASAS = new Set<string>([
  "I.A SESI ESCOLA PF",
  "PF-SESI ESCOLA",
  "PF-SESI ITACOATIARA",
  "SESI",
  "SESI Escola",
  "SESI Paritins - AM",
  "Paritins - AM",
  "SESI Parintins - AM",
  "Parintins - AM",
  "PF-MATRICULA",
]);

// Casas que devem aparecer como PF-SESI SAUDE quando Entidade SESI é selecionada
const PF_SESI_SAUDE_CASAS = new Set<string>([
  "I.A SESI SAUDE PF",
  "PF-SESI SAUDE",
  "CENTRAL ODONTOLOGIA",
  "PF-ODONTOLOGIA",
  "SESI SAÚDE",
  "Unidade Centro",
  "Unidade Leste",
]);

// Casas que devem aparecer como PF-SESI CLUBE quando Entidade SESI é selecionada
const PF_SESI_CLUBE_CASAS = new Set<string>(["PF-SESI CLUBE", "CENTRAL CLUBE"]);

// Casas que devem aparecer como PF-EJA quando Entidade SESI é selecionada
const PF_SESI_EJA_CASAS = new Set<string>(["PF-EJA"]);

// Casas que devem aparecer no SESI (incluindo LABORATÓRIO)
const SESI_CASAS = new Set<string>([
  "I.A SESI ESCOLA PF",
  "PF-SESI ESCOLA",
  "PF-SESI ITACOATIARA",
  "PF-SESI CLUBE",
  "I.A SESI SAUDE PF",
  "PF-SESI SAUDE",
  "CENTRAL ODONTOLOGIA",
  "PF-ODONTOLOGIA",
  "LABORATÓRIO",
  "CENTRAL CLUBE",
  "PF-EJA",
  "PF-MATRICULA",
  "SESI Parintins - AM",
  "Parintins - AM",
]);

const SENAI_CASAS = new Set<string>(["I.A Senai PF", "I.A SENAI PF", "PF-SENAI", "PF- SENAI"]);

const SESI_ESCOLA_CASAS = new Set<string>([
  "I.A SESI ESCOLA PF",
  "PF-SESI ESCOLA",
  "PF-SESI ITACOATIARA",
]);

const SESI_CLUBE_CASAS = new Set<string>(["PF-SESI CLUBE"]);

const SESI_SAUDE_CASAS = new Set<string>([
  "I.A SESI SAUDE PF",
  "PF-SESI SAUDE",
  "CENTRAL ODONTOLOGIA",
  "PF-ODONTOLOGIA",
]);

const IEL_CASAS = new Set<string>(["PF- IEL"]);

// Função para verificar se o usuário usa os filtros avançados (Ariana + Master)
export function isArianaUser(): boolean {
  const userStr = localStorage.getItem("auth_user");
  if (!userStr) return false;
  try {
    const user = JSON.parse(userStr);
    // Verifica se o email contém "ariana" (case insensitive) OU se é master
    return user.email?.toLowerCase().includes("ariana") || user.nivel_acesso === "master" || false;
  } catch {
    return false;
  }
}

// Função para aplicar renomeação de equipes
export function getEquipeLabel(casa: string): string {
  if (!isArianaUser()) return casa;
  return RENOMEACAO_EQUIPES[casa] || casa;
}

// Função para obter o display name da equipe no contexto da entidade (para Ariana)
export function getEquipeDisplayName(casa: string, entidade: Entidade | null): string {
  if (!isArianaUser() || !entidade) return getEquipeLabel(casa);

  // Aplicar renomeação primeiro
  const baseName = getEquipeLabel(casa);

  // Manter casas I.A com seus nomes originais em qualquer entidade
  if (casa.startsWith("I.A ")) {
    return casa;
  }

  // Para entidade específica, adicionar prefixo PF-
  if (entidade === "SENAI" && PF_SENAI_CASAS.has(casa)) {
    return baseName.startsWith("PF-") ? baseName : `PF-${baseName}`;
  }
  if (entidade === "IEL" && PF_IEL_CASAS.has(casa)) {
    return baseName.startsWith("PF-") ? baseName : `PF-${baseName}`;
  }
  if (entidade === "SESI") {
    if (PF_SESI_ESCOLA_CASAS.has(casa)) {
      return "PF-SESI ESCOLA";
    }
    if (PF_SESI_SAUDE_CASAS.has(casa)) {
      return "PF-SESI SAUDE";
    }
    if (PF_SESI_CLUBE_CASAS.has(casa)) {
      return "PF-SESI CLUBE";
    }
    if (PF_SESI_EJA_CASAS.has(casa)) {
      return "PF-EJA";
    }
  }

  return baseName;
}

export function mapCasaToEntidadeUnidade(casa: string | null | undefined): EntidadeUnidade {
  if (!casa) return { entidade: null };

  // Para usuário Ariana, usa os novos mapeamentos PF
  if (isArianaUser()) {
    if (PF_SENAI_CASAS.has(casa)) {
      return { entidade: "SENAI" };
    }
    if (PF_IEL_CASAS.has(casa)) {
      return { entidade: "IEL" };
    }
    if (PF_SESI_ESCOLA_CASAS.has(casa) || PF_SESI_SAUDE_CASAS.has(casa) || PF_SESI_CLUBE_CASAS.has(casa) || PF_SESI_EJA_CASAS.has(casa) || SESI_CASAS.has(casa)) {
      if (PF_SESI_ESCOLA_CASAS.has(casa)) {
        return { entidade: "SESI", unidade: "SESI ESCOLA" };
      }
      if (PF_SESI_SAUDE_CASAS.has(casa)) {
        return { entidade: "SESI", unidade: "SESI SAÚDE" };
      }
      if (PF_SESI_CLUBE_CASAS.has(casa)) {
        return { entidade: "SESI", unidade: "SESI CLUBE" };
      }
      return { entidade: "SESI" };
    }
  }

  // Mapeamento padrão para outros usuários
  if (SENAI_CASAS.has(casa)) {
    return { entidade: "SENAI" };
  }

  if (SESI_ESCOLA_CASAS.has(casa)) {
    return { entidade: "SESI", unidade: "SESI ESCOLA" };
  }

  if (SESI_CLUBE_CASAS.has(casa)) {
    return { entidade: "SESI", unidade: "SESI CLUBE" };
  }

  if (SESI_SAUDE_CASAS.has(casa)) {
    return { entidade: "SESI", unidade: "SESI SAÚDE" };
  }

  if (IEL_CASAS.has(casa)) {
    return { entidade: "IEL" };
  }

  return { entidade: null };
}

export function mapCasaToEntidadeGerente(casa: string | null | undefined): Entidade | null {
  if (!casa) return "Outros";
  // Para Ariana, casas excluídas não devem aparecer em nenhuma entidade
  if (isArianaUser() && EXCLUIDOS_OUTROS.has(casa)) return null;
  const { entidade } = mapCasaToEntidadeUnidade(casa);
  return entidade || "Outros";
}

function isMappedCasa(c: string): boolean {
  if (isArianaUser()) {
    return (
      PF_SENAI_CASAS.has(c) ||
      PF_IEL_CASAS.has(c) ||
      PF_SESI_ESCOLA_CASAS.has(c) ||
      PF_SESI_CLUBE_CASAS.has(c) ||
      PF_SESI_SAUDE_CASAS.has(c) ||
      PF_SESI_EJA_CASAS.has(c) ||
      SESI_CASAS.has(c)
    );
  }
  return (
    SENAI_CASAS.has(c) ||
    SESI_ESCOLA_CASAS.has(c) ||
    SESI_CLUBE_CASAS.has(c) ||
    SESI_SAUDE_CASAS.has(c) ||
    IEL_CASAS.has(c)
  );
}


// Retorna casas filtradas por entidade (para Ariana)
function getCasasForEntidadeAriana(casasList: string[], entidade: Entidade): string[] {
  if (entidade === "SENAI") {
    return casasList.filter((c) => PF_SENAI_CASAS.has(c));
  }
  if (entidade === "IEL") {
    return casasList.filter((c) => PF_IEL_CASAS.has(c));
  }
  if (entidade === "SESI") {
    return casasList.filter(
      (c) => PF_SESI_ESCOLA_CASAS.has(c) || PF_SESI_CLUBE_CASAS.has(c) || PF_SESI_SAUDE_CASAS.has(c) || PF_SESI_EJA_CASAS.has(c) || SESI_CASAS.has(c)
    );
  }
  if (entidade === "Outros") {
    return casasList.filter((c) => {
      const isMapped = isMappedCasa(c) || EXCLUIDOS_OUTROS.has(c);
      return !isMapped;
    });
  }
  return [];
}

export function getEquipesForEntidade(
  casasList: string[] | undefined,
  entidade: Entidade | "" | null
): { value: string; label: string }[] {
  if (!casasList || !entidade) return [];

  if (isArianaUser()) {
    const filtered = getCasasForEntidadeAriana(casasList, entidade as Entidade);

    // Deduplicate by display label — group multiple raw casas under one label
    const labelSet = new Set<string>();
    for (const c of filtered) {
      const label = getEquipeDisplayName(c, entidade as Entidade);
      labelSet.add(label);
    }

    return Array.from(labelSet)
      .sort()
      .map((label) => ({ value: label, label }));
  }

  // Lógica padrão para outros usuários
  let filtered: string[];
  if (entidade === "SENAI") {
    filtered = casasList.filter((c) => SENAI_CASAS.has(c));
  } else if (entidade === "SESI") {
    filtered = casasList.filter(
      (c) => SESI_ESCOLA_CASAS.has(c) || SESI_CLUBE_CASAS.has(c) || SESI_SAUDE_CASAS.has(c)
    );
  } else if (entidade === "IEL") {
    filtered = casasList.filter((c) => IEL_CASAS.has(c));
  } else if (entidade === "Outros") {
    filtered = casasList.filter((c) => !isMappedCasa(c) && c !== "Falta de Interação");
  } else {
    filtered = [];
  }

  return filtered.sort().map((c) => ({ value: c, label: c }));
}

// Expande labels de equipes selecionadas para todos os raw casas correspondentes
export function getCasasForEquipeLabels(
  casasList: string[] | undefined,
  entidades: Entidade[],
  equipeLabels: string[]
): string[] {
  if (!casasList || entidades.length === 0 || equipeLabels.length === 0) return [];

  // Para usuários não-Ariana, labels = raw casa names
  if (!isArianaUser()) {
    return equipeLabels;
  }

  const labelSet = new Set(equipeLabels);
  const result = new Set<string>();

  for (const entidade of entidades) {
    const allCasas = getCasasForEntidadeAriana(casasList, entidade);
    for (const c of allCasas) {
      const label = getEquipeDisplayName(c, entidade);
      if (labelSet.has(label)) {
        result.add(c);
      }
    }
  }

  return Array.from(result);
}

export function getCasasForFiltro(
  todasAsCasas: string[] | undefined,
  entidade: Entidade | "" | null,
  unidade: UnidadeSESI | "" | null
): string[] {
  if (!todasAsCasas) {
    return [];
  }

  // Para usuário Ariana, usa os novos conjuntos
  if (isArianaUser()) {
    // "Todas as Entidades" → retorna apenas casas mapeadas
    if (!entidade) {
      return todasAsCasas.filter((c) => isMappedCasa(c));
    }

    if (entidade === "SESI" && unidade) {
      if (unidade === "SESI ESCOLA") {
        return todasAsCasas.filter((c) => PF_SESI_ESCOLA_CASAS.has(c));
      }
      if (unidade === "SESI CLUBE") {
        return todasAsCasas.filter((c) => PF_SESI_CLUBE_CASAS.has(c));
      }
      if (unidade === "SESI SAÚDE") {
        return todasAsCasas.filter((c) => PF_SESI_SAUDE_CASAS.has(c));
      }
    }

    return getCasasForEntidadeAriana(todasAsCasas, entidade as Entidade);
  }

  // Lógica padrão para outros usuários
  // "Todas as Entidades" → retorna apenas casas mapeadas (SENAI + SESI + IEL)
  if (!entidade) {
    return todasAsCasas.filter((c) => isMappedCasa(c));
  }

  if (entidade === "SENAI") {
    return todasAsCasas.filter((c) => SENAI_CASAS.has(c));
  }

  if (entidade === "IEL") {
    return todasAsCasas.filter((c) => IEL_CASAS.has(c));
  }

  if (entidade === "SESI") {
    if (!unidade) {
      return todasAsCasas.filter(
        (c) =>
          SESI_ESCOLA_CASAS.has(c) ||
          SESI_CLUBE_CASAS.has(c) ||
          SESI_SAUDE_CASAS.has(c)
      );
    }

    if (unidade === "SESI ESCOLA") {
      return todasAsCasas.filter((c) => SESI_ESCOLA_CASAS.has(c));
    }
    if (unidade === "SESI CLUBE") {
      return todasAsCasas.filter((c) => SESI_CLUBE_CASAS.has(c));
    }
    if (unidade === "SESI SAÚDE") {
      return todasAsCasas.filter((c) => SESI_SAUDE_CASAS.has(c));
    }
  }

  if (entidade === "Outros") {
    return todasAsCasas.filter((c) => !isMappedCasa(c));
  }

  return [];
}

// Gerente mode: "Todas as Entidades" returns ALL casas (including unmapped)
export function getCasasForFiltroGerente(
  todasAsCasas: string[] | undefined,
  entidade: Entidade | "" | null,
  equipe: string | null
): string[] {
  if (!todasAsCasas) return [];

  // Equipe específica selecionada → retorna só essa casa
  if (equipe) {
    return todasAsCasas.filter((c) => c === equipe);
  }

  // "Todas as Entidades" → retorna TODAS as casas (sem filtro)
  if (!entidade) {
    return []; // empty = no filter = all data
  }

  // Para usuário Ariana — usa a mesma lógica centralizada
  if (isArianaUser()) {
    return getCasasForEntidadeAriana(todasAsCasas, entidade as Entidade);
  }

  // Lógica padrão
  if (entidade === "SENAI") return todasAsCasas.filter((c) => SENAI_CASAS.has(c));
  if (entidade === "IEL") return todasAsCasas.filter((c) => IEL_CASAS.has(c));
  if (entidade === "SESI") {
    return todasAsCasas.filter(
      (c) => SESI_ESCOLA_CASAS.has(c) || SESI_CLUBE_CASAS.has(c) || SESI_SAUDE_CASAS.has(c)
    );
  }
  if (entidade === "Outros") {
    return todasAsCasas.filter((c) => !isMappedCasa(c));
  }

  return [];
}

export interface AssuntoAggregado {
  nome: string;
  total: number;
  originalNames?: string[];
}

interface AssuntoRule {
  keywords: string[];
  categoria: string;
}

// Ordem importa: regras mais especificas PRIMEIRO.
// Ex: "Orcamento Exame" tem que bater em Orcamento antes de Exame.
const ASSUNTO_RULES: AssuntoRule[] = [
  // 1. ORCAMENTO (muito especifico - pega tudo que tem "orcamento")
  { keywords: ["orcamento","cotacao","valor curso","valor exame","valor academia","preco curso","preco exame"], categoria: "Orcamento" },

  // 2. AGENDAMENTO CONSULTA (medico/saude/clinico/retorno/especialista)
  { keywords: ["agendamento consulta","marcar consulta","consulta medica","consulta medico","agendar consulta","agendamento medico","agendar medico","remarcar consulta","agendar clinico","agendamento clinico","agendamento retorno","retorno consulta","retorno medico","agendar retorno","consulta especialista","especialista medico","agendar especialista","agendamento oftalmologista","agendamento odontologico"], categoria: "Agendamento Consulta" },

  // 3. RESERVA/LOCACAO (antes de espera para pegar "reserva confirmada")
  { keywords: ["reserva","locacao","aluguel","quadra","espaco clube","campo sintetico","arena","salao"], categoria: "Reserva/Locacao" },

  // 4. LISTA DE ESPERA (unifica lista e fila)
  { keywords: ["lista espera","fila espera","aguardando vaga","em espera"], categoria: "Lista de Espera" },

  // 5. MATRICULA / INSCRICAO
  { keywords: ["matricula","matricular","inscricao","inscrever","cadastro curso","vaga curso","turma"], categoria: "Matricula" },

  // 6. CERTIFICADO / DIPLOMA
  { keywords: ["certificado","certificacao","diploma","declaracao curso","comprovante curso","historico escolar"], categoria: "Certificado" },

  // 7. CARTEIRINHA (unifica emissao/renovacao/sesi)
  { keywords: ["carteirinha","carteira sesi","emissao carteira","renovacao carteira"], categoria: "Carteirinha" },

  // 8. PROGRAMACAO CURSO (cursos especificos)
  { keywords: ["programacao curso","grade curricular","horario aula","curso","aula","treinamento","workshop","capacitacao","eja","supletivo","jovem aprendiz","pacote aluno","informatica basica","informatica avancada","bolsa gratuidade","bolsa"], categoria: "Programacao Curso" },

  // 9. EXAME (inclui "exam" typo e "laudo")
  { keywords: ["exame","exam","laudo","resultado exame"], categoria: "Exame" },

  // 10. ODONTOLOGICO
  { keywords: ["odontologico","odonto","dentista","ortodontia"], categoria: "Odontologico" },

  // 11. VACINA / SAUDE
  { keywords: ["vacina","gripe","imunizacao","vacinacao"], categoria: "Vacina" },

  // 12. RESSONANCIA / IMAGEM (funde com Exame)
  { keywords: ["ressonancia","raio-x","raio x","tomografia","ultrassom","ultrasom","imagem medica"], categoria: "Exame" },

  // 13. PROCESSO SELETIVO / ESTAGIO
  { keywords: ["processo seletivo","vaga estagio","estagio","selecao","processo selecao"], categoria: "Processo Seletivo" },

  // 14. CANCELAMENTO
  { keywords: ["cancelamento","cancelar","desmarcar","desistencia","desistir","trancamento"], categoria: "Cancelamento" },

  // 15. REAGENDAMENTO
  { keywords: ["reagendamento","remarcar","adiar","transferencia consulta"], categoria: "Reagendamento" },

  // 16. PAGAMENTO / BOLETO / NOTA FISCAL
  { keywords: ["pagamento","boleto","cobranca","fatura","mensalidade","nota fiscal","taxa","reembolso"], categoria: "Pagamento" },

  // 17. SEM INTERACAO (unifica falta, sem interacao, resposta negativa)
  { keywords: ["sem interacao","falta interacao","falta de interacao","sem resposta","resposta negativa","nao respondeu","desistiu"], categoria: "Sem Interacao" },

  // 18. DOCUMENTO / COMPROVANTE / FICHA
  { keywords: ["documento","comprovante","atestado","ficha enviada","ficha"], categoria: "Documento" },

  // 19. INFORMACAO (generico - captura "informacao senai", "informacao iel", etc.)
  { keywords: ["informacao","orientacao","esclarecimento","info"], categoria: "Informacao" },

  // 20. DUVIDA (fallback generico)
  { keywords: ["duvida","pergunta","questionamento","ajuda","nao sei"], categoria: "Duvida Geral" },
];

// Termos que sao entidades e NAO devem aparecer como assuntos.
// Quando o assunto original for APENAS um destes termos (ou variante), cai em "Informacao".
const ENTIDADES_COMO_ASSUNTO = new Set([
  "senai","sesi","iel","sesi saude","sesi clube","sesi escola","sesi odontologia","fieam",
]);

const STOP_WORDS = new Set(["de","da","do","das","dos","para","pra","por","sobre","em","a","o","as","os","e","ou","mas","se","que","com","sem","no","na","nos","nas","um","uma","uns","umas","ao","aos","ele","ela","eles","elas","eu","voce","vc","meu","minha","seu","sua","esse","essa","isso","este","esta","isto","qual","quais","quem","cujo","cujos","onde","quando","como","porque","assim","tambem","ja","ainda","so","soh","soamente","muito","mais","menos","tanto","tal","toda","todo","todas","todos","outro","outra","outros","outras","mesmo","mesma","mesmos","mesmas"]);

const GENERIC_WORDS = new Set(["solicitacao","pedido","usuario","cliente","atendimento","interacao","conversa","chat","ligacao","telefone","email","contato","pessoa","assunto","tema","topico","help","support","atendente","bot","virtual","online","web","site","app","geral"]);

function normalizeForMatching(raw: string): string {
  return (raw || "").toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ç/g, "c")
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function categorizarPorRegras(raw: string): string | null {
  const normalized = normalizeForMatching(raw);
  if (!normalized) return null;

  // Redireciona entidades soltas (ex: "SENAI", "SESI SAUDE") para "Informacao"
  if (ENTIDADES_COMO_ASSUNTO.has(normalized)) {
    return "Informacao";
  }

  for (const rule of ASSUNTO_RULES) {
    for (const kw of rule.keywords) {
      if (normalized.includes(kw)) return rule.categoria;
    }
  }
  return null;
}

function resumirEmTresPalavras(raw: string): string {
  const normalized = normalizeAssuntoKey(raw);
  const words = normalized.split(" ").filter(w => w.length > 2 && !STOP_WORDS.has(w) && !GENERIC_WORDS.has(w));
  const limited = words.slice(0, 3);
  if (limited.length === 0) {
    const fallback = raw.split(" ").filter(w => w.length > 2).slice(0, 3);
    return fallback.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ") || raw;
  }
  return limited.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

export function normalizeAssuntoKey(raw: string): string {
  const base = (raw || "").toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ç/g, "c")
    .replace(/ñ/g, "n");
  
  const cleaned = base
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleaned.split(" ").filter((w) => !["de", "da", "do", "das", "dos", "para", "pra", "por", "sobre", "em"].includes(w));

  if (words.length === 0) return cleaned;

  const singularized = words.map((w) => {
    // Handle common plural patterns in Portuguese - order matters!
    // Skip "oes" pattern for words that were originally "ções" 
    // (they become "coes" after accent removal, not "oes")
    if (w.endsWith("oes") && !w.includes("c")) return w.slice(0, -3) + "o"; // ex: pões -> pão
    if (w.endsWith("aes")) return w.slice(0, -3) + "ao"; // ex: capitaes -> capitao  
    if (w.endsWith("eis")) return w.slice(0, -3) + "el"; // ex: animais -> animal
    if (w.endsWith("res")) return w.slice(0, -2); // ex: mulheres -> mulher (irregular, but basic)
    if (w.endsWith("is")) return w.slice(0, -2) + "l"; // ex: canais -> canal
    if (w.endsWith("coes")) {
      return w.slice(0, -4) + "cao"; // ex: informacoes -> informacao
    }
    if (w.endsWith("es") && w.length > 3) return w.slice(0, -2); // ex: informacoes -> informacao
    if (w.endsWith("s") && w.length > 3) return w.slice(0, -1); // general case
    return w;
  });

  return singularized.join(" ");
}

export function agruparAssuntos(data: AssuntoAggregado[]): AssuntoAggregado[] {
  const mapa = new Map<string, number>();
  const originals = new Map<string, string[]>();

  for (const item of data || []) {
    const raw = item.nome;
    if (!raw) continue;

    // 1. Tentar categorizar por regras de palavras-chave
    const categoria = categorizarPorRegras(raw);

    // 2. Se nao houver match, resumir em no maximo 3 palavras
    const key = categoria || resumirEmTresPalavras(raw);
    if (!key) continue;

    const existente = mapa.get(key);
    if (existente !== undefined) {
      mapa.set(key, existente + item.total);
    } else {
      mapa.set(key, item.total);
    }
    const orig = originals.get(key) || [];
    orig.push(raw);
    originals.set(key, orig);
  }

  return Array.from(mapa.entries())
    .map(([key, total]) => ({
      nome: key,
      total,
      originalNames: originals.get(key) || [],
    }))
    .sort((a, b) => b.total - a.total);
}

