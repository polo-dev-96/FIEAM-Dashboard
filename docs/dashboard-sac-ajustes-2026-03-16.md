## Ajustes no Dashboard - SAC (Visão Geral e Dashboard Anual)

### 1. Cards de métricas na Visão Geral
- **Removidos** os cards:
  - Atendimentos Hoje
  - Este mês
  - Duração média
- **Novos cards**:
  - **Total no Período de Atendimento**: utiliza `stats.totais.total` considerando o intervalo de datas selecionado.
  - **Média de Atendimentos por Mês**: calculada como `total / número de meses no período`, usando `differenceInCalendarMonths` entre `startDate` e `endDate` (mínimo 1 mês).
  - **Média de Atendimentos por Dia**: calculada como `total / número de dias no período`, usando `differenceInCalendarDays` entre `startDate` e `endDate` (mínimo 1 dia).

### 2. Novo modelo de filtros (Entidade / Unidade)
- **Substituído** o filtro `Casa` por dois filtros:
  - **Entidade** (`SENAI`, `SESI`, `IEL`).
  - **Unidade** (apenas habilitado quando `Entidade = SESI`, com opções `SESI ESCOLA`, `SESI CLUBE`, `SESI SAÚDE`).
- Implementado util em `client/src/lib/entidadeMapping.ts`:
  - `mapCasaToEntidadeUnidade(casa)`:
    - **SENAI**:
      - `"I.A Senai PF"`, `"PF-SENAI"` → `entidade: "SENAI"`.
    - **SESI ESCOLA**:
      - `"I.A SESI ESCOLA PF"`, `"PF-SESI ESCOLA"`, `"PF-SESI ITACOATIARA"` → `entidade: "SESI", unidade: "SESI ESCOLA"`.
    - **SESI CLUBE**:
      - `"PF-SESI CLUBE"` → `entidade: "SESI", unidade: "SESI CLUBE"`.
    - **SESI SAÚDE**:
      - `"I.A SESI SAUDE PF"`, `"PF-SESI SAUDE"`, `"CENTRAL ODONTOLOGIA"`, `"PF-ODONTOLOGIA"` → `entidade: "SESI", unidade: "SESI SAÚDE"`.
    - **IEL**:
      - `"PF- IEL"` → `entidade: "IEL"`.
  - `getCasasForFiltro(todasAsCasas, entidade, unidade)`:
    - Retorna o subconjunto de `casas` que pertence à combinação Entidade/Unidade selecionada.
    - É utilizado tanto na **Visão Geral** quanto no **Dashboard - SAC** para gerar `selectedCasas` e montar os parâmetros das chamadas de API.

### 3. Gráficos na Visão Geral
- **Renomeados**:
  - `"Atendimentos por Canal"` → **"Atendimentos por Meio de Comunicação"** (mesmo dataset `stats.porCanal`).
  - `"Atendimentos por Casa"` → **"Atendimentos por Entidade"`.
- **Nova agregação** para o gráfico de Entidade:
  - Construído um array `atendimentosPorEntidade` derivado de `stats.porCasa`, aplicando `mapCasaToEntidadeUnidade`:
    - Para `SENAI` e `IEL`, as barras usam o rótulo da própria Entidade.
    - Para `SESI`, as barras são exibidas por Unidade (`SESI ESCOLA`, `SESI CLUBE`, `SESI SAÚDE`).
  - Utilizado `atendimentosPorEntidade` tanto no gráfico quanto na seção de **Entidade Líder** (antes `Casa Líder`).

### 4. Unificação de assuntos (Top Assuntos / Ranking Assuntos)
- Implementado em `entidadeMapping.ts`:
  - `normalizeAssuntoKey(raw)`:
    - Converte para minúsculas.
    - Remove acentos.
    - Remove caracteres especiais, normaliza espaços.
    - Remove stopwords simples (`de, da, do, das, dos, para, pra, por, sobre, em`).
    - Aplica singularização simples: remove `s` final em palavras com mais de 3 caracteres (ex.: `cursos` → `curso`).
  - `agruparAssuntos(data)`:
    - Recebe um array `{ nome, total }`.
    - Agrupa pelo resultado de `normalizeAssuntoKey(nome)` e soma os `total` de assuntos equivalentes.
    - Retorna a lista ordenada em ordem decrescente de `total`.
- **Aplicações**:
  - **Visão Geral**:
    - `Top Assuntos` agora utiliza `topAssuntosAggregados = agruparAssuntos(stats.porResumo)`.
  - **Dashboard - SAC**:
    - `Ranking de Assuntos` utiliza `rankingAssuntos = agruparAssuntos(stats.porAssunto)`.
    - O painel de insights (`Top 3`, `Top 5`, `Cauda Longa`) passa a se basear em `rankingAssuntos`, já unificado.

### 5. Filtros e exportação
- **Visão Geral (`Overview.tsx`)**:
  - `selectedCasas` agora é derivado de `entidade` e `unidade` via `getCasasForFiltro`, e é usado:
    - Nas queries `/api/stats`, `/api/recentes`.
    - No componente `ExportReportDialog`.
  - `ExportReportDialog` recebe:
    - `pdfTitle="Visão Geral - Dashboard FIEAM"`.
    - `pdfSubtitle` dinâmico:
      - Sem entidade: `"Dashboard de atendimentos em tempo real · Todas as Entidades"`.
      - Com entidade: `"Dashboard de atendimentos em tempo real · Entidade: {ENTIDADE} · Unidade: {UNIDADE}"` (quando `SESI` + unidade).
- **Dashboard - SAC (`DashboardAnual.tsx`)**:
  - Mesmo padrão de `selectedCasas` derivado de Entidade/Unidade para:
    - `/api/anual-stats`.
    - `/api/anual-drilldown`.
    - `ExportReportDialog`.
  - `ExportReportDialog` recebe:
    - `pdfTitle="Dashboard - SAC"`.
    - `pdfSubtitle` dinâmico:
      - Sem entidade: `"Visão de Atendimentos - Todas as Entidades"`.
      - Com entidade: `"Visão de Atendimentos - Entidade: {ENTIDADE} · Unidade: {UNIDADE}"` (quando `SESI` + unidade).
  - O util `exportElementToPdf` já monta a **capa do PDF** com o `title` fornecido (`"Visão Geral - Dashboard FIEAM"` ou `"Dashboard - SAC"`) e o `subtitle` passado pelo componente de exportação.

### 6. Renomeações para Dashboard - SAC
- Página anual:
  - `Layout`:
    - Título alterado de `"Dashboard Anual"` para **"Dashboard - SAC"** (em estado de carregamento e conteúdo).
  - Sidebar (`Sidebar.tsx`):
    - Item de menu `/anual` alterado de `"Dashboard Anual"` para **"Dashboard - SAC"**.
- Com isso, tanto a navegação quanto o conteúdo refletem a nova nomenclatura.

