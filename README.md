# Crash Game - Full-stack Challenges

Este repositório contém a minha solução para o desafio Full-stack da Jungle Gaming, focando em um sistema distribuído de Crash Game em tempo real com alta precisão monetária e arquitetura orientada a eventos.

**Nota sobre o tempo de desenvolvimento:** Gostaria de destacar que, embora o prazo estipulado para o desafio fosse de 120 horas (5 dias), devido ao meu tempo curto, precisei planejar e executar toda esta solução em **menos de 10 horas**.

Para tornar isso possível e ainda garantir a alta qualidade e cobertura exigidas, me apoiei fortemente na técnica de **Spec-Driven Development (SDD)**. Orientar o desenvolvimento puramente pelas especificações e testes documentados no desafio foi o que me permitiu focar no que realmente importava e entregar os Bounded Contexts, a mensageria e o frontend em tempo recorde sem sacrificar a estabilidade.

## Minhas Decisões de Arquitetura

Desenhei este sistema para ser resiliente, escalável e manter a consistência absoluta dos saldos financeiros. Dividi o projeto em dois **Bounded Contexts** principais (`Games` e `Wallets`), operando como microsserviços sob uma arquitetura orientada a eventos.

1. **Domain-Driven Design (DDD):** Implementei ambos os microsserviços backend (`games` e `wallets`) em NestJS utilizando uma separação estrita de camadas: `domain`, `application`, `infrastructure` e `presentation`.
2. **Separação de Banco de Dados:** Embora hospedado no mesmo cluster PostgreSQL, criei schemas lógicos próprios e instâncias isoladas do Prisma para cada serviço. Isso garante que eu não crie acoplamentos de banco de dados entre os domínios.
3. **Precisão Monetária (Sem Ponto Flutuante):** Para assegurar a exatidão contábil, processei e armazenei todos os valores monetários em _centavos inteiros_ (`BIGINT` / `Integer`). Isso elimina problemas de arredondamento inerentes ao uso de ponto flutuante.
4. **Mensageria e Consistência Eventual (Outbox/Inbox Pattern):**
   - Configurei a comunicação entre o _Game Service_ e o _Wallet Service_ de forma assíncrona via **RabbitMQ** (exchange `crash.wallet.v1`).
   - Para resolver o problema de _dual-write_ (salvar no banco e publicar o evento sem risco de inconsistência), adotei o **Transactional Outbox Pattern**. O meu domínio persiste o evento em uma tabela `outbox` na mesma transação da regra de negócio.
   - Do outro lado, adotei o **Inbox Pattern / Idempotency** armazenando o `event_id` dos eventos processados, me garantindo assim _at-least-once delivery_ pelo broker e _exactly-once processing_ pela aplicação (evitando a duplicação de saldo).
5. **Comunicação Cliente-Servidor:**
   - Centralizei as ações ativas do jogador (como Apostar ou Sacar) exclusivamente via **API REST**, roteadas pelo API Gateway (Kong).
   - Configurei o servidor para empurrar o estado contínuo do jogo via **WebSocket** de forma puramente _read-only_ (unidirecional do servidor para o cliente). Isso me ajudou a simplificar a lógica de estado na interface e prevenir vulnerabilidades de concorrência.
6. **Algoritmo Provably Fair:** Implementei a geração do _Crash Point_ utilizando hashes determinísticos e sementes pré-estabelecidas (Server Seed vs Client Seed + Nonce) validáveis publicamente, garantindo que o jogo seja justo.

## Trade-offs

- **RabbitMQ vs SQS/LocalStack:** Optei por usar RabbitMQ como broker para simplificar o tempo de _startup_ local no Docker e reduzir a curva de recursos consumidos em comparação com uma emulação pesada via LocalStack.
- **Vite (React SPA) vs Next.js:** Como um _Crash Game_ exige respostas em tempo real, estado persistente no cliente (WebSockets ativos) e não demanda SEO (pois fica atrás de login e a tela é altamente dinâmica), abri mão do Next.js (SSR) em favor de uma **Single Page Application** montada com Vite, `TanStack Router` e `TanStack Query`. Isso reduz a sobrecarga do meu servidor, entregando os assets rapidamente e gerenciando tudo no browser.
- **Auto-Cashout no Backend vs Frontend:** O limite automático de cashout (_auto-cashout_) configurado pelo jogador é enviado no momento do `POST /bet` e decidi gerenciá-lo ativamente no **Backend**. _Meu trade-off aqui:_ Isso aumenta levemente a carga no servidor durante o _loop_ do jogo, mas considero estritamente necessário para garantir que interrupções de rede do cliente não o façam perder uma aposta ganha.

## Tecnologias Utilizadas

- **Runtime:** Bun
- **Backend:** NestJS + TypeScript (strict mode)
- **Banco de Dados:** PostgreSQL + Prisma ORM
- **Mensageria:** RabbitMQ
- **Gateway & Autenticação:** Kong API Gateway + Keycloak (OIDC)
- **Frontend:** React + Vite + Tailwind CSS v4 + shadcn/ui
- **State Management:** TanStack Query + Zustand

## Minhas Etapas de Inicialização (Setup)

Deixei o projeto 100% conteinerizado para rodar de ponta a ponta sem necessidade de configuração de variáveis de ambiente na sua máquina host.

### Pré-requisitos

- [Bun](https://bun.sh) instalado.
- Docker e Docker Compose rodando.

### 1. Iniciar a Aplicação

Faça o clone do repositório, instale as dependências e rode o comando principal:

```bash
bun install
bun run docker:up
```

_(Criei este script para orquestrar e inicializar automaticamente o PostgreSQL, RabbitMQ, Keycloak, Kong, backend services, migrations do Prisma, e o Frontend. O processo do Keycloak importa automaticamente o realm que configurei para o jogo.)_

### 2. Acessar os Recursos

Uma vez que os containers estiverem saudáveis:

- **Frontend (UI do Jogo):** `http://localhost:3000`
- **Keycloak Admin:** `http://localhost:8080`
- **Kong Gateway (APIs):** `http://localhost:8000`
- **RabbitMQ Painel UI:** `http://localhost:15672`

### 3. Usuário de Teste Pré-Configurado

Para facilitar, configurei o ambiente para injetar um usuário de teste via Realm do Keycloak e já gerar a carteira dele no banco de dados com saldo inicial. Para acessar o Frontend, use:

- **Username:** `player`
- **Password:** `player123`

### Comandos Úteis e Testes

Para parar os serviços e limpar a infraestrutura:

```bash
bun run docker:down
bun run docker:prune
```

Para rodar a bateria de **Testes Unitários** que escrevi:

```bash
cd services/games && bun test tests/unit
cd ../wallets && bun test tests/unit
cd ../../frontend && bun test
```

Para rodar os **Testes E2E** (É necessário que o `docker:up` esteja ativo no background):

```bash
cd services/wallets && bun run test:e2e
cd ../games && bun run test:e2e
```

## Bônus Alcançados

Mesmo com o tempo curto, consegui contemplar as seguintes funcionalidades bônus listadas no desafio original:

- **Outbox/Inbox transacional:** (Garantia de consistência financeira distribuída).
- **Auto Cashout no Backend:** Execução server-side para segurança contra lag de rede.
- **Leaderboard:** Endpoints em tempo real categorizando lucros de jogadores nas últimas 24h e 7 dias.
- **Rate Limiting:** Proteção que apliquei em rotas chaves.
- **Fórmula da Curva UI:** Transparência Provably Fair exposta visualmente na tela ao jogador.
