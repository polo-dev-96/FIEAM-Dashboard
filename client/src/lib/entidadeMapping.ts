export type Entidade = "SENAI" | "SESI" | "IEL" | "Outros";

export type UnidadeSESI = "SESI ESCOLA" | "SESI CLUBE" | "SESI SAÚDE";

export type Equipe = string;

export interface EntidadeUnidade {
  entidade: Entidade | null;
  unidade?: UnidadeSESI;
}

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

export function mapCasaToEntidadeUnidade(casa: string | null | undefined): EntidadeUnidade {
  if (!casa) return { entidade: null };

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
  const { entidade } = mapCasaToEntidadeUnidade(casa);
  return entidade || "Outros";
}

function isMappedCasa(c: string): boolean {
  return (
    SENAI_CASAS.has(c) ||
    SESI_ESCOLA_CASAS.has(c) ||
    SESI_CLUBE_CASAS.has(c) ||
    SESI_SAUDE_CASAS.has(c) ||
    IEL_CASAS.has(c)
  );
}


export function getEquipesForEntidade(
  casasList: string[] | undefined,
  entidade: Entidade | "" | null
): { value: string; label: string }[] {
  if (!casasList || !entidade) return [];


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

export function getCasasForFiltro(
  todasAsCasas: string[] | undefined,
  entidade: Entidade | "" | null,
  unidade: UnidadeSESI | "" | null
): string[] {
  if (!todasAsCasas) {
    return [];
  }

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

  // Entidade específica
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
    const key = normalizeAssuntoKey(item.nome);
    if (!key) continue;
    const existente = mapa.get(key);
    if (existente !== undefined) {
      mapa.set(key, existente + item.total);
    } else {
      mapa.set(key, item.total);
    }
    const orig = originals.get(key) || [];
    orig.push(item.nome);
    originals.set(key, orig);
  }

  // Convert back to array with properly capitalized display names
  return Array.from(mapa.entries())
    .map(([key, total]) => ({
      nome: key.charAt(0).toUpperCase() + key.slice(1),
      total,
      originalNames: originals.get(key) || [],
    }))
    .sort((a, b) => b.total - a.total);
}

