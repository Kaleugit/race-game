# Executive Summary Template

Use this template to create or update `docs/RESUMO-EXECUTIVO.md`.
Render final content in the project language.

```md
# Resumo Executivo do Projeto

## Metadados
- Última atualização: YYYY-MM-DD
- Responsável: Arquiteto
- Status: EM_REVISAO | APROVADO | SUPERSEDIDO
- Fonte primária de escopo: `docs/PROJECT_SPECS.md`
- Fonte primária de roadmap: `docs/EPICOS.md`

## Regra de Uso
- Este documento é um resumo executivo para avaliação humana.
- Este documento não substitui os artefatos canônicos.
- Em caso de conflito, prevalecem `docs/PROJECT_SPECS.md` e `docs/EPICOS.md`.
- O versionamento do documento é feito pelo histórico Git.
- Não criar variantes de nome como `RESUMO-EXECUTIVO-v2.md`.

## 1. Decisão Executiva
- Recomendação atual: SEGUIR | SEGUIR_COM_RESTRICOES | REPLANEJAR | PAUSAR
- Motivo principal:
- Condições para seguir:
- Principais pontos de atenção:

## 2. Visão do Projeto
- Nome do projeto:
- Objetivo principal:
- Problema que resolve:
- Público-alvo:
- Resultado de negócio esperado:
- Métricas de sucesso em alto nível:

## 3. Escopo Executivo
### Incluído
- [item de maior impacto]

### Fora de escopo
- [item explicitamente excluído]

## 4. Visão da Solução
- Abordagem proposta:
- Principais capacidades esperadas:
- Integrações relevantes:
- Restrições relevantes:
- Requisitos não funcionais críticos:
- Visão arquitetural de alto nível:

## 5. Roadmap Macro
| Ordem | Epic ID | Título | Objetivo Executivo | Dependências | Entrega Esperada | Sinal de Conclusão |
|------|---------|--------|--------------------|--------------|------------------|--------------------|
| 1 | EP-001 | [Título] | [resultado esperado] | None | [entrega macro] | [evidência observável] |
| 2 | EP-002 | [Título] | [resultado esperado] | EP-001 | [entrega macro] | [evidência observável] |

## 6. Marcos e Milestones
| Marco | Descrição | Critério de Passagem | Dependências |
|------|-----------|----------------------|--------------|
| M1 | Roadmap aprovado | `docs/EPICOS.md` aprovado pelo humano | Bootstrap completo |
| M2 | Primeiro valor entregue | [critério] | [dependência] |
| M3 | Pronto para operação inicial | [critério] | [dependência] |

## 7. Cronograma Macro
- Horizonte estimado: [curto / médio / longo prazo]
- Estratégia de sequenciamento: [sequencial / parcialmente paralela]
- Janela indicativa por milestone:
  - M1: [janela relativa]
  - M2: [janela relativa]
  - M3: [janela relativa]
- Observação:
  - Este cronograma é macro e indicativo.
  - Não substitui planejamento de task.
  - Não usar datas exatas sem validação humana explícita.

## 8. Dependências Críticas
- [dependência externa, aprovação, fornecedor, time, dado, ambiente]

## 9. Riscos Executivos
| Risco | Impacto | Mitigação | Dono |
|------|---------|-----------|------|
| [risco] | [alto/médio/baixo] | [ação] | [papel] |

## 10. Decisões Pendentes
- [decisão que precisa de validação humana]
- [trade-off ainda aberto]

## 11. Próximo Gate Recomendado
- Próximo passo:
- Documento/gate associado:
- Aprovação humana necessária:
- Condição objetiva para avançar:

## 12. Referências Canônicas
- `docs/PROJECT_SPECS.md`
- `docs/EPICOS.md`
- `docs/architecture.md`
- `docs/api-contracts.md`
- `docs/decisions.md`
- `memory-system/1-project-context.md`
```
