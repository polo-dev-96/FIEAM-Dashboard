export type Entidade = "SENAI" | "SESI" | "IEL";

export type UnidadeSESI = "SESI ESCOLA" | "SESI CLUBE" | "SESI SAÚDE";

export interface EntidadeUnidade {
  entidade: Entidade | null;
  unidade?: UnidadeSESI;
}

const SENAI_CASAS = new Set<string>(["I.A Senai PF", "PF-SENAI"]);

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

export function getCasasForFiltro(
  todasAsCasas: string[] | undefined,
  entidade: Entidade | "" | null,
  unidade: UnidadeSESI | "" | null
): string[] {
  if (!todasAsCasas || !entidade) {
    return [];
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

  return [];
}

export interface AssuntoAggregado {
  nome: string;
  total: number;
}

export function normalizeAssuntoKey(raw: string): string {
  const base = (raw || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const cleaned = base
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleaned.split(" ").filter((w) => !["de", "da", "do", "das", "dos", "para", "pra", "por", "sobre", "em"].includes(w));

  if (words.length === 0) return cleaned;

  const singularized = words.map((w) => {
    if (w.length > 3 && w.endsWith("s")) {
      return w.slice(0, -1);
    }
    return w;
  });

  return singularized.join(" ");
}

export function agruparAssuntos(data: AssuntoAggregado[]): AssuntoAggregado[] {
  const mapa = new Map<string, { nome: string; total: number }>();

  for (const item of data || []) {
    const key = normalizeAssuntoKey(item.nome);
    if (!key) continue;
    const existente = mapa.get(key);
    if (existente) {
      existente.total += item.total;
    } else {
      mapa.set(key, { nome: item.nome, total: item.total });
    }
  }

  return Array.from(mapa.values()).sort((a, b) => b.total - a.total);
}

