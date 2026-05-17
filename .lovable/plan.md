## Objetivo

Permitir que `jobs_disparos` agende e dispare Web Push para os alunos inscritos, começando com um lembrete de check-in diário às 8h (BRT).

## Mudanças

### 1. Banco (migration)
- Adicionar valor `push_lembrete` ao enum `job_tipo`.
- Adicionar coluna `payload jsonb` (nullable) em `jobs_disparos` para armazenar `{title, body, url, tag}` do push.

### 2. Web Push no Worker (`src/server/web-push.server.ts`)
- Implementação manual de VAPID (JWT ES256) + criptografia ECDH/AES-GCM (RFC 8291) usando WebCrypto, compatível com Cloudflare Workers (sem `web-push`/`node-gyp`).
- `sendWebPush(subscription, payload)` retorna `{ ok, status }`.

### 3. Helper de envio (`src/server/aluno-push-send.server.ts`)
- `enviarPushParaAluno(alunoId, payload)`: busca todas as subs em `aluno_push_subscriptions`, envia em paralelo, deleta subs com 404/410 (gone).

### 4. Motor (`src/server/motor.functions.ts`)
- Novo case `push_lembrete`: lê `payload` do job e chama `enviarPushParaAluno`. Não usa Z-API/WhatsApp para esse tipo.

### 5. Agendador diário (`src/routes/api/public/hooks/agendar-push-checkin.ts`)
- Roda às 7:55 BRT, insere um job `push_lembrete` para cada aluno ativo com sub válida, `agendado_para` = hoje 08:00 BRT, payload de check-in (`/aluno`).

### 6. Cron pg_cron
- 7:55 BRT → chama `/api/public/hooks/agendar-push-checkin`.
- Motor já roda a cada 5 min (mantém-se), o `push_lembrete` é processado dentro do mesmo loop.

### 7. Secrets necessários
- `VAPID_PRIVATE_KEY` (par da pública já em `src/lib/push-vapid.ts`).
- `VAPID_SUBJECT` (ex.: `mailto:contato@mpteam.com`).

## Riscos
- Se a chave privada não for o par da pública atual, todos os pushes retornam 401/403 — nesse caso geramos novo par e atualizamos `push-vapid.ts` (alunos terão que reativar).
- iOS exige PWA instalada (já tratado na UI).

## Fora de escopo
- Outros lembretes (água, treino) — fica trivial depois (basta agendar `push_lembrete` com payload diferente).
