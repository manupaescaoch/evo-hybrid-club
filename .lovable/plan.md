## Visão geral

Transformar a aba **Treino** do aluno (hoje uma sessão única) em um **planejador de corrida completo**, no padrão de uma planilha profissional (estilo TrainingPeaks / Final Surge), com 4 níveis:

```
Macrociclo (prova-alvo)
  └─ Mesociclo (4 semanas, com fase: Base/Específico/Pico/Taper)
       └─ Microciclo (semana, com 7 dias)
            └─ Sessão (dia, com 1 ou mais treinos: corrida, força, mobilidade)
                 └─ Blocos (aquecimento, intervalado, etc — já existe)
```

E uma **Biblioteca de modelos** transversal (sessões e semanas reutilizáveis).

---

## 1. Modelo de dados (novas tabelas)

Mantém `treinos_planos` + `treinos_blocos` atuais como "Sessão + Blocos" (renomeio conceitual, sem migração destrutiva) e adiciona:

- **`corrida_perfil`** (1 por aluno) — parâmetros do corredor:
  - `fc_max`, `fc_repouso`, `pace_limiar` (min/km), `vo2max_estimado` (VDOT), `nivel` (iniciante/intermediário/avançado), `volume_semanal_atual_km`, `historico_lesoes` (text), `experiencia_anos`.

- **`corrida_provas`** (N por aluno) — provas-alvo:
  - `distancia` (5k/10k/15k/21k/42k/ultra), `data_prova`, `nome`, `tempo_meta`, `tempo_pb`, `prioridade` (A/B/C), `local`.

- **`corrida_macrociclos`** — vincula prova + estratégia:
  - `prova_id`, `data_inicio`, `data_fim`, `volume_pico_km`, `metodo_periodizacao` (linear/polarizado/piramidal/reverso).

- **`corrida_mesociclos`** — blocos de 4 semanas:
  - `macro_id`, `ordem`, `nome`, `fase` (base1/base2/específico/pico/taper/transição), `semanas` (default 4), `volume_alvo_km`, `objetivo`.

- **`corrida_microciclos`** (semana) — núcleo do planner:
  - `meso_id` (opcional — semana solta também), `aluno_id`, `numero_semana`, `data_inicio` (segunda), `tipo_semana` (forte/regenerativa/choque/polimento), `volume_alvo_km`, `intensidade_alvo_pct` (% Z3+), `observacao`, `status` (rascunho/publicada).

- **`corrida_sessoes`** — substitui o conceito atual de "treino solto" como filho do microciclo:
  - `microciclo_id`, `data` (date), `ordem_no_dia` (0/1), `tipo` (longao/regenerativo/intervalado/tempo/fartlek/strides/forca/mobilidade/cross/descanso), `nome`, `duracao_min`, `distancia_km`, `pace_alvo`, `zona_fc`, `objetivo`, `observacao`, `executada` (bool), `executado_tempo_min`, `executado_distancia_km`, `executado_pse` (1-10), `executado_observacao`.

- **`corrida_sessao_blocos`** — equivalente ao `treinos_blocos` atual, mas ligado a `sessao_id`.

- **`corrida_modelos_sessao`** (biblioteca) — `nome`, `tipo`, `descricao`, `blocos` (jsonb ou tabela filha), `tags[]`, `criado_por`.

- **`corrida_modelos_semana`** (biblioteca) — `nome`, `tipo_semana`, `volume_km`, `dias` (jsonb: `[{ dow, sessoes: [modelo_sessao_id|inline] }]`), `tags[]`.

Todas com RLS no mesmo padrão das tabelas existentes (`is_crm_user` SELECT, `is_equipe_or_admin` INSERT/UPDATE, `is_admin` DELETE).

---

## 2. Cálculo de zonas (pace + FC)

Função utilitária pura `src/lib/corrida-zonas.ts`:

- **FC** (Karvonen): `FC_alvo = ((FCmax − FCrep) × %intensidade) + FCrep`
  - Z1: 50-60% / Z2: 60-70% / Z3: 70-80% / Z4: 80-90% / Z5: 90-100%
- **Pace** a partir do limiar (ou VDOT se preenchido):
  - Easy: limiar + 60-90s/km · Maratona: limiar + 20-30s · Limiar: ±5s · Intervalo: limiar − 15-25s · Repetição: limiar − 30-45s
- Cada zona exibida no editor como **"Z2 · 5:45–6:10 /km · 132–148 bpm"** (calculado em tempo real a partir do perfil).

Se o perfil estiver incompleto, mostra aviso e usa apenas o valor manual digitado pelo treinador.

---

## 3. UX — nova aba Treino (CRM, dentro do perfil do aluno)

Substitui o `TreinoTab.tsx` atual por um layout em 3 níveis com tabs internas:

```
┌─ Treino do aluno ─────────────────────────────────┐
│ [Perfil de corrida] [Provas] [Plano] [Biblioteca] │
├───────────────────────────────────────────────────┤
│ (conteúdo da tab ativa)                           │
└───────────────────────────────────────────────────┘
```

**Tab Perfil de corrida** — form simples: FCmax, FCrep, pace limiar, VDOT, nível, volume semanal atual, lesões. Salva em `corrida_perfil`.

**Tab Provas** — lista de provas-alvo. Adicionar prova abre form (distância, data, meta, PB, prioridade). Botão "Gerar plano a partir desta prova" → cria macrociclo + mesociclos automaticamente por periodização reversa.

**Tab Plano** — a peça central. Layout vertical:

```
[ Macro: Maratona POA 18/mai/2026 · 24 semanas · Polarizado ]
   ├─ Meso 1 — Base 1 (sem 1-4) — 30→40 km/sem
   ├─ Meso 2 — Base 2 (sem 5-8) — 40→55 km/sem    ◄── expandida
   │     │
   │     │  ┌─ Semana 5 (24/nov - 30/nov) — 45km · forte ──┐
   │     │  │ Seg  Ter   Qua   Qui   Sex   Sáb   Dom       │
   │     │  │ Off  6km   Inter 8km   Off   Forç  Long 16k  │
   │     │  │       reg  10x400      reg          progress │
   │     │  │                                              │
   │     │  │ Total: 45km · 80/20 ✓ · Carga ↑10% vs S4    │
   │     │  └──────────────────────────────────────────────┘
   │     │  [Semana 6] [Semana 7] [Semana 8 — regenerativa]
   │     │
   ├─ Meso 3 — Específico (sem 9-16)
   ├─ Meso 4 — Pico (sem 17-20)
   └─ Meso 5 — Taper (sem 21-24)
```

- **Grid de semana**: 7 colunas (SEG-DOM), cada célula é um "cartão de sessão" clicável. Vazio = "+ adicionar sessão" / "Descanso".
- **Clicar numa sessão** abre painel lateral (Sheet) com o editor atual de blocos (já temos), agora com zonas calculadas e botão "Carregar de modelo".
- **Header da semana**: volume total (km e min), distribuição de intensidade (barra 80/20), aderência (executado vs prescrito), botão duplicar/excluir.
- **Alertas automáticos** no header:
  - "⚠ Aumento de volume >10% vs semana anterior" (regra dos 10%)
  - "⚠ 3 semanas fortes seguidas — adicione uma regenerativa"
  - "✓ Distribuição 80/20 saudável"

**Tab Biblioteca** — duas seções:
- **Modelos de sessão** (ex: "10×400m R", "Long run progressivo 18k", "Fartlek 3x8min"). Lista + criar/editar.
- **Modelos de semana** (ex: "Semana base 40km", "Semana de qualidade meia", "Recovery week"). Permite aplicar a qualquer semana com 1 clique (cria as 7 sessões).

---

## 4. Geração automática (periodização reversa)

Server function `gerar_macrociclo_da_prova(prova_id)` em `src/lib/corrida-planner.functions.ts`:

1. Calcula nº de semanas entre `hoje` e `data_prova`.
2. Distribui em fases conforme distância da prova:
   - **5k/10k** (12 sem): 4 Base + 4 Específico + 2 Pico + 2 Taper
   - **Meia** (16 sem): 6 Base + 6 Específico + 2 Pico + 2 Taper
   - **Maratona** (20-24 sem): 8 Base + 8 Específico + 4 Pico + 2-4 Taper
3. Cria volume progressivo (3 fortes + 1 regenerativa em cada meso), respeitando volume atual do aluno e volume pico planejado.
4. Pré-popula cada semana com um **template padrão** da fase (longão domingo, qualidade terça/quinta, regenerativos, descanso segunda/sexta). Treinador refina depois.

---

## 5. App do aluno (`src/routes/aluno.treino.tsx`)

A aba semana, hoje mockada, passa a ler `corrida_microciclos` + `corrida_sessoes` reais:
- Pontos azuis nos dias com sessão = vêm do plano salvo pelo treinador.
- Header da semana mostra nome do meso e nº da semana (ex: "Semana 5 de 24 · Base 2").
- "Treino de hoje" = a primeira sessão de hoje no plano.
- Modal de finalização (já existe) grava `executada`, `executado_tempo_min`, `executado_distancia_km`, `executado_pse` na sessão.

---

## 6. Implementação em ondas

Pra não virar um big-bang, sugiro 3 entregas:

- **Onda 1 — Fundação + Semana**: cria `corrida_perfil`, `corrida_microciclos`, `corrida_sessoes`, `corrida_sessao_blocos`, biblioteca de modelos de sessão. Editor de semana com grid 7 dias + sheet de sessão. App do aluno lê semana real.
- **Onda 2 — Macro/Meso + prova-alvo**: `corrida_provas`, `corrida_macrociclos`, `corrida_mesociclos`, geração automática a partir da prova, biblioteca de modelos de semana.
- **Onda 3 — Inteligência**: zonas pace+FC calculadas, alertas (10%, 80/20, ACWR), aderência executado vs prescrito, exportar plano semanal em PDF.

---

## Detalhes técnicos

- Tabelas novas com `id uuid default gen_random_uuid()`, `criado_em/atualizado_em timestamptz`, triggers `tg_set_atualizado_em` (já existe), RLS no padrão atual.
- Mantém `treinos_planos`/`treinos_blocos` atuais por compatibilidade; nova feature usa as tabelas `corrida_*`. Após onda 1 estável, migração silenciosa do dado antigo para `corrida_sessoes`.
- Editor de semana usa drag-and-drop opcional (lib `@dnd-kit/core`, já leve) para mover sessões entre dias.
- Cálculo de zonas é função pura em `src/lib/corrida-zonas.ts` (testável).
- Geração de macro é `createServerFn` com `requireSupabaseAuth`, transaction única.
- App do aluno: nova `createServerFn` `getSemanaAtualDoAluno(aluno_id, data)` no `src/server/aluno-treino.functions.ts`.
- Tipos TS gerados automaticamente após a migração (não editar `types.ts` à mão).

---

## Pergunta antes de começar a onda 1

Confirma que quer começar pela **Onda 1 (Fundação + Semana)** com a estrutura acima? Se quiser, posso já incluir 4-6 modelos de sessão pré-prontos na biblioteca (long run, regenerativo, intervalado VO2, tempo run, fartlek, strides) pra você não começar do zero.
