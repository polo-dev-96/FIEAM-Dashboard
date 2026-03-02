# Fix: Filtro de Datas na Tabela de Últimos Atendimentos

**Data:** 13/02/2026

## Problema:

A tabela "Últimos Atendimentos Finalizados" não respeitava o filtro de datas selecionado no DateRangePicker. Os cards de métricas e o gráfico de timeline filtravam corretamente, mas a tabela sempre mostrava **todos** os atendimentos, independente do período selecionado.

## Causa

O endpoint `/api/recentes` não aceitava parâmetros de data, e o frontend não os enviava.

## Alterações Realizadas

### Backend: `server/routes.ts`

O endpoint `GET /api/recentes` agora aceita `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`:

```sql
-- Filtro adicionado na subquery de deduplicação
SELECT MAX(id) AS max_id
FROM `base senai`
WHERE `data e hora de fim` IS NOT NULL
  AND DATE(`data e hora de fim`) >= ?
  AND DATE(`data e hora de fim`) <= ?
GROUP BY protocolo
```

Quando os parâmetros não são fornecidos, retorna todos (mantém compatibilidade).

### Frontend: `client/src/pages/Overview.tsx`

A query de recentes agora inclui o `dateRange` na queryKey e na URL:

```typescript
const { data: recentes } = useQuery<Atendimento[]>({
    queryKey: ["recentes", dateRange.startDate, dateRange.endDate],
    queryFn: () => apiRequest(`/api/recentes?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`),
    refetchInterval: REFRESH_INTERVAL,
});
```

## Impacto

- A tabela de atendimentos agora filtra junto com os cards e gráficos
- Alterar o período no DateRangePicker atualiza toda a página consistentemente
- A contagem "Mostrando X de Y" reflete apenas os registros do período selecionado

