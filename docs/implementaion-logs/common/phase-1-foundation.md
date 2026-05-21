## [2026-05-21] C1: Scaffold application and infrastructure baseline

**Plan reference:** `docs/plans/common-sequential-plan.md`

**Summary:**
- NestJS 프로젝트 초기 스캐폴드를 생성하고, 스펙이 정의한 소스 레이아웃(`src/`, `database/`, `integrations/`, `shared/`, `modules/`), Docker Compose 인프라(app/postgres/redis), 환경 로딩 기반(JWT/DB/Redis/LLM/runtime config namespace)을 확립했습니다.

**Dependencies reviewed before starting:**
- `docs/plans/common-sequential-plan.md` — Task C1 acceptance criteria
- `docs/specs/01-architecture.md` — Docker Compose 서비스 구성 및 런타임 경계 규칙
- `docs/specs/03-modules.md` — 소스 레이아웃 계약, 모듈 내부 구조 규칙
- `docs/specs/07-integrations-and-ai.md` — Confirmed Docker Model, LLM/Redis/WebSocket 역할 정의

**Implementation details:**
- `package.json`: pnpm, NestJS 11, TypeORM 0.3.20, TypeScript 6 기반으로 설정. `build`, `dev`, `typecheck`, `lint`, migration 스크립트 포함.
- `tsconfig.json`: `commonjs`, `emitDecoratorMetadata`, `experimentalDecorators` 활성화. path alias(`@common/`, `@database/`, `@integrations/`, `@shared/`, `@modules/`) 설정. `rootDir: ./src`, `ignoreDeprecations: "6.0"` (TypeScript 6 baseUrl deprecation 억제).
- `src/app.module.ts`: `ConfigModule.forRoot({ isGlobal: true })` 으로 6개 config namespace(app/database/jwt/redis/llm/runtime)를 전역 로드.
- `src/database/database.module.ts`: `TypeOrmModule.forRootAsync` + `ConfigService`로 DB 접속. `synchronize: false` 기본값(마이그레이션 전용).
- `src/database/data-source.ts`: TypeORM CLI 마이그레이션 실행용 독립 DataSource. `dotenv.config()` 직접 호출.
- `integrations/`: jwt/redis/llm/runtime/websocket/mq 어댑터 스텁 모듈 생성. 구현은 각 Worker 스트림에서 담당.
- `modules/`: auth/ai-chat-sessions/game-rooms/game-room-participants/game-room-missions/turns/executions/mission-results/realtime 9개 도메인 모듈 스텁 생성. 각 모듈에 `controller/`, `service/`, `entity/` 디렉터리(`.gitkeep`) 포함. realtime은 `gateway/` 포함.
- `docker-compose.yml`: `app`(docker.sock 마운트), `postgres:16-alpine`, `redis:7-alpine` 3서비스 구성. 헬스체크 조건부 depends_on 설정.
- `Dockerfile`: 멀티스테이지(base → deps → build → production). production stage는 `dist/` + prod 의존성만 포함.
- `.env.example`: JWT/DB/Redis/LLM/Runtime 전체 환경변수 템플릿 제공.

**Files changed:**
- `package.json`
- `tsconfig.json`, `tsconfig.build.json`, `nest-cli.json`
- `src/main.ts`
- `src/app.module.ts`
- `src/common/config/app.config.ts`
- `src/common/config/database.config.ts`
- `src/common/config/jwt.config.ts`
- `src/common/config/redis.config.ts`
- `src/common/config/llm.config.ts`
- `src/common/config/runtime.config.ts`
- `src/common/index.ts`
- `src/database/database.module.ts`
- `src/database/data-source.ts`
- `src/integrations/jwt/jwt.module.ts`
- `src/integrations/redis/redis.module.ts`
- `src/integrations/llm/llm.module.ts`
- `src/integrations/runtime/runtime.module.ts`
- `src/integrations/websocket/websocket.module.ts`
- `src/integrations/mq/mq.module.ts`
- `src/modules/*/` (9개 모듈 스텁 + 각 내부 디렉터리)
- `src/shared/{enums,dto,interfaces,mappers}/` (C2 대기 스텁)
- `docker-compose.yml`
- `Dockerfile`
- `database/migrations/.gitkeep`, `database/seeds/.gitkeep`
- `.env.example`
- `.gitignore`, `.npmrc`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`

**Verification:**
- [x] `pnpm typecheck` (`tsc --noEmit`) — 통과
- [x] `pnpm build` (`nest build`) — 통과
- [x] 소스 레이아웃이 `docs/specs/03-modules.md` 계약과 일치함을 육안 검증
- [x] docker-compose.yml이 `app`/`postgres`/`redis` + `/var/run/docker.sock` 마운트를 포함함을 검증
- [x] 6개 config namespace(app/database/jwt/redis/llm/runtime)가 `ConfigModule.forRoot`에 모두 로드됨 확인
- [ ] `pnpm lint` — ESLint 미설치 (C2에서 설정 예정). 현 시점 linter 미구성이 허용됨.
- [ ] Docker Compose 실제 구동 테스트 — `.env` 미설정으로 로컬 미실행. DB/Redis 접속은 C2 이후 실제 모듈 구현 시 검증.

**Commit:**
- `4f390a4` feat(scaffold): Task C1 - 애플리케이션 및 인프라 기반 스캐폴드 구성

**Impact on next tasks:**
- **C2 (공유 계약 및 퍼시스턴스 규약 확립)** 진입 가능: config namespace, TypeORM DataSource, 마이그레이션 경로(`database/migrations/`), 모듈 내부 구조가 준비됨.
- 각 Worker 스트림: `src/modules/{module}` 하위 `controller/`, `service/`, `entity/`에 직접 파일을 추가하면 됨. 모듈 스텁에 `@Module({})` 선언만 있으므로 각 Worker가 imports/providers/exports를 채우면 됨.
- `src/app.module.ts`에 도메인 모듈 import 추가는 C2 또는 각 Worker 착수 시점에 수행.

**Design decisions made:**
- **TypeORM 0.3.x 선택**: 설치 시 1.0.0이 기본 해석되었으나 0.3.20으로 명시 고정. 0.3.x가 현행 안정 버전이며 NestJS 11과 호환.
- **`synchronize: false` 기본값**: 데이터 안전을 위해 마이그레이션 전용으로 고정. 개발 환경도 `DB_SYNCHRONIZE=true` 환경변수로만 활성화 가능.
- **모듈 스텁 comment 유지**: 각 Worker가 모듈 책임과 의존성을 확인할 수 있도록 스펙 요약 comment를 `.module.ts`에 포함.
- **`ignoreDeprecations: "6.0"`**: TypeScript 6에서 `baseUrl` deprecated 경고를 억제. path alias는 C2에서 검토 후 필요 시 `moduleResolution: bundler`로 전환 가능.

**Deviations from spec:**
- 없음. 모든 구성이 `docs/specs/01-architecture.md`, `03-modules.md`, `07-integrations-and-ai.md`와 일치함.

**Trade-offs:**
- **통합 모듈 vs 스텁 분리**: 스텁 모듈만 생성하고 실제 구현은 각 Worker에게 위임. 대안(처음부터 상세 구현)은 Worker 스트림과 충돌 위험이 있으므로 채택하지 않음.
- **Redis 헬스체크 조건부 처리**: `REDIS_PASSWORD` 설정 시 `redis-cli ping`이 실패하는 문제를 `CMD-SHELL`로 조건 분기하여 해결.

**Open questions:**
- [x] TypeORM `synchronize: false`가 모든 환경에서 적용되는가? → Yes, 명시적으로 `DB_SYNCHRONIZE=true` 환경변수로만 활성화.
- [ ] ESLint 설정은 C2에서 추가할 예정인가? → C2 담당자가 결정 필요. `pnpm lint` 스크립트는 준비되어 있음.

**Open risks or follow-ups:**
- `dist/` 빌드 결과물이 `.gitignore`에 포함되어 git 추적 제외됨. Dockerfile이 이를 빌드 스테이지에서 생성하므로 문제 없음.
- `tsconfig.tsbuildinfo` / `tsconfig.build.tsbuildinfo`도 ignore 처리됨.
- 마이그레이션 파일은 아직 없음. C2에서 첫 번째 마이그레이션(초기 테이블 생성)이 추가될 예정.

**Instructions for the next worker:**
- C2 진입 전 이 로그를 읽고 config namespace 이름(`database`, `jwt`, `redis`, `llm`, `runtime`)을 `ConfigService.get<T>('namespace.key')` 패턴으로 활용할 것.
- 새 도메인 모듈 구현 시 `src/modules/{module-name}/{module-name}.module.ts` 스텁에 imports/providers/exports를 추가하면 됨.
- 새 모듈을 앱에 등록하려면 `src/app.module.ts`의 `imports` 배열에 추가할 것.
- 마이그레이션 생성: `pnpm migration:generate -- database/migrations/<MigrationName>` 실행.
- ESLint 미설정 상태. `pnpm lint` 스크립트는 준비되어 있으나 C2에서 eslint 패키지 추가가 필요함.
- 실제 Docker Compose 실행 시 `.env.example`을 `.env`로 복사하고 시크릿 값을 채워야 함.
