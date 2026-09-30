# Treinos compartilhados do clube

## Objetivo
Mover a montagem de treinos para uma página própria no painel, logo abaixo de **Alunos**, e usar uma única programação oficial para todos os alunos.

## Mudanças
- Criar a página **Treinos** no menu principal, imediatamente abaixo de **Alunos**, também acessível no menu do celular.
- Levar para essa página o construtor semanal já criado: troca de semana, geração automática, dias, sessões, blocos HYROX, biblioteca, resultados e publicação.
- Remover a edição de treino de dentro da ficha individual do aluno, evitando versões diferentes por aluno.
- Marcar no banco qual é a programação oficial do clube e garantir apenas uma semana oficial por data.
- Migrar a programação publicada atual da Manu para esse formato oficial, sem perder sessões, blocos ou resultados.
- Fazer Início e WOD do app do aluno consultarem exclusivamente essa programação oficial, igual para todas as contas.
- Manter os salvamentos por atualização dos mesmos treinos e blocos, preservando resultados já registrados.

## Validação
- Abrir **Treinos** pelo menu e editar/publicar uma semana.
- Entrar em duas contas de aluno e confirmar que ambas exibem o mesmo WOD na página inicial e na página WOD.
- Confirmar que sessões, blocos e resultados existentes continuam disponíveis.

## Detalhes técnicos
- Adicionar um indicador de programação global em `corrida_microciclos`, com unicidade por semana para a grade oficial.
- Adaptar o construtor para o modo global, mantendo a estrutura atual de dados e o aluno técnico já associado aos registros antigos apenas como compatibilidade interna.
- Alterar a leitura do app do aluno para selecionar a semana global publicada, sem depender do nome de quem a criou nem do aluno autenticado.
