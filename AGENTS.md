# AGENTS.md — apimesh-cli

Adobe I/O CLI plugin (`@adobe/aio-cli-plugin-api-mesh`) for creating and managing API Mesh configurations.

---

## Repository Overview

This project is an [oclif](https://oclif.io/) plugin that extends the Adobe I/O CLI (`aio`). It lets developers create, update, and locally run API Meshes — GraphQL gateways that federate multiple upstream APIs into a single endpoint, powered by Cloudflare Workers.

**How it works end-to-end:**

1. The user writes a `mesh.json` file describing sources (REST, GraphQL, SOAP), transforms, hooks, and plugins.
2. The CLI validates and submits that config to the **Schema Management Service (SMS)** — the Adobe-hosted backend that builds and deploys the mesh to Cloudflare.
3. Once provisioned, the mesh is reachable at a Cloudflare-hosted GraphQL endpoint.
4. For local development, the CLI builds the mesh artifact with `@adobe-apimesh/mesh-builder` and runs it locally via Wrangler (Cloudflare Workers runtime).

**Key external dependencies:**

| Dependency | Role |
|------------|------|
| `@adobe/aio-lib-ims` | IMS authentication — fetches bearer tokens |
| `@adobe/aio-cli-lib-console` | Adobe Developer Console — org/project/workspace selection |
| `@adobe-apimesh/mesh-builder` | Validates, builds, and compiles mesh configs locally |
| `wrangler` | Runs the Cloudflare Workers runtime locally for `aio api-mesh:run` |
| `@graphql-mesh/*` | GraphQL Mesh engine — the core runtime for stitching APIs |

**Environments:**

| Env | SMS API | Mesh Endpoint |
|-----|---------|---------------|
| Prod (Production workspace) | `https://graph.adobe.io/api-admin` | `https://edge-graph.adobe.io/api/<meshId>/graphql` |
| Prod (non-Production workspace) | `https://graph.adobe.io/api-admin` | `https://edge-sandbox-graph.adobe.io/api/<meshId>/graphql` |
| Stage | `https://graph-stage.adobe.io/api-admin` | `https://edge-stage-graph.adobe.io/api/<meshId>/graphql` |

Switch to stage with `aio config set cli.env stage`. All URL constants live in `src/constants.js` and can be overridden via environment variables.

---

## Domain Concepts

| Term | Meaning |
|------|---------|
| **Mesh** | A GraphQL gateway config combining multiple upstream sources |
| **Mesh ID** | Unique identifier assigned by SMS on create, tied to org+project+workspace |
| **Mesh Config** | The `meshConfig` block in the user's JSON file — sources, transforms, plugins |
| **Mesh Artifact** | Compiled output of `mesh-builder` — stored in `mesh-artifact/<meshId>/` during `run` |
| **`.mesh/`** | Packaged artifact directory read by Wrangler during local dev |
| **Tenant Files** | JS hook/plugin files referenced in the mesh config — bundled into `tenantFiles/` |
| **Ray ID** | Per-request unique ID on the Cloudflare edge — used to look up individual logs |
| **Secrets** | YAML key-value pairs, encrypted client-side with the org's RSA public key before upload |
| **Log Forwarding** | Routing mesh request logs to an external destination (e.g. New Relic) |
| **SMS** | Schema Management Service — Adobe's backend for mesh CRUD and deployment |
| **Placeholder interpolation** | `${VAR}` syntax in `mesh.json` resolved against a `.env` file before submission |

---

## Where Domain Logic Lives

### API / Network layer
- **`src/lib/smsClient.js`** — all HTTP calls to the SMS backend and Adobe Developer Console. Every command goes through functions here (`createMesh`, `updateMesh`, `getMesh`, `getMeshId`, `cachePurge`, `getLogsByRayId`, `setLogForwarding`, `getPublicEncryptionKey`, etc.). If SMS behavior changes, start here.

### Auth and context resolution
- **`src/helpers.js`** — `initSdk()` is the entry point for every command. It resolves the IMS token, looks up org/project/workspace via Dev Console, caches the result. Also contains `importFiles()` (bundles local JS files into the mesh config), `interpolateMesh()` (placeholder substitution), `setUpTenantFiles()` (installs downloaded artifact), and all `prompt*()` helpers.

### Environment constants
- **`src/constants.js`** — SMS URLs, API keys, and limits (`MAX_SECRET_COUNT=50`, `MAX_SECRET_SIZE_BYTES=5120`) for both stage and prod. Selected at startup based on `aio-lib-env`; each constant can be overridden by a matching environment variable.

### Mesh endpoint URL construction
- **`src/urlBuilder.js`** — `buildMeshUrl(meshId, workspaceName)` — returns prod, sandbox, or stage URL based on workspace name and current env.

### Local dev runtime
- **`src/worker.js`** — the Cloudflare Workers entry point run by Wrangler. Imports the built mesh artifact from `.mesh/`, builds a Fastify-backed GraphQL server on first request, and caches it for subsequent hot requests.
- **`src/server.js`** — builds the Fastify+GraphQL Mesh server instance used by the worker.
- **`src/wranglerCli.js`** — `start()` spawns `npx wrangler dev` with the correct entry point, port, secrets binding, and `wrangler.toml`.
- **`src/project.js`** — file-system helpers for the build pipeline: `copyBuiltMeshToPackage()` moves the artifact from `mesh-artifact/` to `.mesh/`, `safeDelete/Rename/Copy` wrappers.
- **`src/meshArtifact.js`** — post-build transforms: resolves `"composer"` strings into static ESM imports (`resolveComposerAsTypeScriptModule`), patches relative source paths for local dev (`resolveRelativeSources`).

### Secrets handling
- **`src/secrets.js`** — runtime: `loadMeshSecrets()` parses the encrypted secrets JSON from the `SECRETS` env var; a Proxy (`getSecretsHandler`) throws on access to undefined keys and blocks mutation.
- **`src/utils.js`** — build-time: `encryptSecrets()` encrypts secrets with the org's RSA public key; `interpolateSecrets()` / `validateSecretsFile()` read and validate the YAML secrets file.

### Server utilities / headers cache
- **`src/serverUtils.js`** — `prepSourceResponseHeaders()` maps upstream response headers to `x-<source>-<header>` format; LRU cache for per-request headers (TTL 5 min, max 500 entries). `readSecretsFile()` loads secrets from disk for Wrangler.

### Logging
- **`src/classes/logger.js`** — pino logger, disabled by default. Enable with `ENABLE_LOGGER=true`; set level with `LOG_LEVEL` (default `info`). Each log line includes `requestId` from the global.
- **`src/classes/UUID.js`** — generates the `requestId` set on `global.requestId` via `initRequestId()` in `helpers.js`.

### Flag definitions
- **`src/utils.js`** — all shared oclif `Flags` objects (`ignoreCacheFlag`, `secretsFlag`, `portNoFlag`, etc.) are defined here and imported into individual command files. When adding a new shared flag, define it here.

### Plugin compatibility fix
- **`src/fixPlugins.js`** — rewrites the compiled mesh `index.js` to redirect `@graphql-mesh/plugin-http-details-extensions` imports to a local fork. Run as a post-build step.

---

## Conventions

### Command structure
- Every command class calls `initSdk()` first to resolve org/project/workspace context.
- Destructive commands (`delete`, `update`, `cache:purge`, log-forwarding changes) always prompt for confirmation unless `--autoConfirmAction` (`-c`) is passed.
- Commands return a plain object from `run()` — oclif serialises this when `--json` is set. The return shape is used by generators like `generator-app-api-mesh`, so don't rename return keys without checking downstream.
- Error messages always append `RequestId: ${global.requestId}` to aid support tracing.

### File layout
- Command source: `src/commands/api-mesh/<command>.js`
- Command tests: `src/commands/api-mesh/__tests__/<command>.test.js` (co-located `__tests__/` folder)
- Fixtures for tests: `src/commands/__fixtures__/`
- New shared flags go in `src/utils.js`, not inline in the command file.

### Module format
- Most files are CommonJS (`require`/`module.exports`).
- `src/worker.js` and `src/state.js` are ESM (`import`/`export`) because they run inside the Cloudflare Workers runtime, which requires ESM.
- Do not mix formats within a file.

### Testing
- Tests mock `src/helpers.js` and `src/lib/smsClient.js` entirely with `jest.mock()` — no real network calls.
- `jest.setup.js` captures stdout/stderr with `stdout-stderr` and sets a 30 s timeout. Tests should not output to the console.
- Fixtures (sample mesh JSON files) live in `src/commands/__fixtures__/`.
- Test files must match the pattern `**/__tests__/*.test.js` or `**/__tests__/*.spec.js` (Jest default).

### Logging
- The pino logger (`src/classes/logger.js`) is **off by default**. Enable it with `ENABLE_LOGGER=true` in the environment.
- Use `logger.info/debug/error`, not `console.log`, except in `src/worker.js` and `src/fixPlugins.js` which run outside the logger context.

### Secrets
- Secrets files are YAML. Max 50 secrets, max 5 KB total. Limits are enforced in `src/utils.js` using `MAX_SECRET_COUNT` and `MAX_SECRET_SIZE_BYTES` from `constants.js`.
- Secrets are encrypted client-side before transmission. The plain-text YAML file should never be committed or logged.

### Adding a new command
1. Create `src/commands/api-mesh/<name>.js` — extend `Command` from `@oclif/core`.
2. Define flags inline or import from `src/utils.js`.
3. Call `initSdk()` at the top of `run()` to get `imsOrgCode`, `projectId`, `workspaceId`.
4. Place API calls in `src/lib/smsClient.js`.
5. Add a co-located test in `src/commands/api-mesh/__tests__/<name>.test.js`.
6. Run `yarn prepack` to regenerate `oclif.manifest.json`.

---

## Project Structure

```
apimesh-cli/
├── src/
│   ├── commands/api-mesh/     # oclif command implementations
│   │   ├── __tests__/         # unit tests per command
│   │   ├── cache/             # cache:purge command
│   │   ├── config/            # config:get/set/delete:log-forwarding commands
│   │   └── source/            # source:discover/get/install commands
│   ├── __tests__/             # unit tests for core modules
│   ├── classes/               # shared classes (logger, etc.)
│   ├── hooks/                 # oclif lifecycle hooks (init, prerun)
│   ├── lib/                   # smsClient and other internal libraries
│   ├── templates/             # scaffold templates used by `init` command
│   └── utils.js               # flag definitions and shared utilities
├── e2e/
│   └── e2e.js                 # end-to-end test suite
├── jest.config.js             # Jest configuration
├── jest.setup.js              # Jest global setup (30 s timeout, stdout capture)
├── prettier.config.js         # Prettier formatting rules
├── .eslintrc.json             # ESLint rules (babel parser + prettier)
└── wrangler.toml              # Cloudflare Workers config for local dev
```

## Prerequisites

- Node.js `^16.13` or `>=18.0.0`
- npm `>=8.0.0`
- yarn (classic, v1)
- [aio-cli](https://github.com/adobe/aio-cli): `npm install -g @adobe/aio-cli`

## Setup

```bash
yarn install
```

Link the plugin locally for development:

```bash
aio plugins:link .
```

## Dev Scripts

### Build / Pack

```bash
yarn prepack        # generates oclif.manifest.json and updates README
yarn postpack       # removes oclif.manifest.json after pack
```

### Lint

```bash
yarn lint           # run ESLint across all source files
yarn lint:fix       # auto-fix ESLint issues
```

### Format

```bash
yarn format         # check formatting with Prettier
yarn format:fix     # auto-fix formatting with Prettier
```

### Test

```bash
yarn test           # run unit tests with coverage (Jest)
yarn test:ci        # run unit tests in CI mode (--ci flag)
yarn unit-tests     # alias for test:ci
```

Test output:
- Coverage report written to `coverage/`
- JUnit XML written to `junit.xml`
- Test timeout: 30 seconds per test (set in `jest.setup.js`)

### E2E Tests

```bash
yarn e2e            # run end-to-end tests (no coverage collection)
```

E2E tests require a live environment with valid `aio` credentials configured.

## Code Style

- **ESLint**: `eslint:recommended` + `plugin:prettier/recommended`; parser is `@babel/eslint-parser`
- **Prettier**: print width 100, tabs (width 2), single quotes, trailing commas, LF line endings
- Ignored paths: `node_modules/`, `dist/`, `tenantFiles/`

## Environment Configuration

Switch between prod (default) and stage:

```bash
aio config clear
aio config set cli.env stage
```

Custom backend config:

```bash
aio config:set api-mesh.cliConfig <path_to_config.json>
```

---

## CLI Commands Reference

All commands are under the `aio api-mesh` namespace. Flags marked **[required]** must be provided.

### Common Flags (available on most commands)

| Flag | Short | Description |
|------|-------|-------------|
| `--ignoreCache` | `-i` | Bypass cached org/project/workspace and prompt for new selection |
| `--autoConfirmAction` | `-c` | Skip interactive confirmation prompts — for CI/scripting |
| `--json` | — | Output result as JSON |

---

### Mesh Lifecycle

#### `aio api-mesh:init <projectName>`
Scaffold a new local API Mesh workspace with sample config, package.json, VS Code launch config, devcontainer, GitHub Actions workflows, and wrangler.toml.

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--path` | `-p` | Target directory for the workspace | `.` |
| `--packageManager` | `-m` | Package manager to use (`npm` or `yarn`) | interactive |
| `--git` | `-g` | Init git in the workspace (`y` or `n`) | interactive |

```bash
aio api-mesh:init my-mesh-project
aio api-mesh:init my-mesh-project --path ./projects/mesh --git y --packageManager yarn
```

---

#### `aio api-mesh:create <mesh.json>`
Create a new mesh from a config file.

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--ignoreCache` | `-i` | Bypass cached selection | false |
| `--autoConfirmAction` | `-c` | Skip confirmation prompt | false |
| `--json` | — | Output result as JSON | false |
| `--env` | `-e` | Path to `.env` file for placeholder interpolation | `.env` |
| `--secrets` | `-s` | Path to secrets YAML file | — |

```bash
aio api-mesh:create mesh.json
aio api-mesh:create mesh.json --env .env.stage --secrets secrets.yaml -c
```

> **Secrets**: The secrets file is a YAML file containing key-value pairs. The CLI fetches the org's public encryption key, encrypts the secrets, and includes them in the mesh payload. Never commit plain-text secrets files.
>
> **Placeholders**: If `mesh.json` contains `${VAR}` placeholders, the CLI reads substitution values from the `--env` file before creating the mesh.
>
> **Warning**: The CLI will warn (but not block) if `includeHTTPDetails: true` is set in a production workspace, as it exposes HTTP details in logs.

---

#### `aio api-mesh:update <mesh.json>`
Update an existing mesh with a new config file.

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--ignoreCache` | `-i` | Bypass cached selection | false |
| `--autoConfirmAction` | `-c` | Skip confirmation prompt | false |
| `--env` | `-e` | Path to `.env` file for placeholder interpolation | `.env` |
| `--secrets` | `-s` | Path to secrets YAML file | — |

```bash
aio api-mesh:update mesh.json
aio api-mesh:update mesh.json --secrets secrets.yaml -c
```

---

#### `aio api-mesh:get [file]`
Retrieve the current mesh config. Optionally write the `meshConfig` block to a local file.

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--ignoreCache` | `-i` | Bypass cached selection | false |
| `--json` | — | Output result as JSON | false |
| `--active` | `-a` | Retrieve the last successfully deployed mesh config | false |

```bash
aio api-mesh:get
aio api-mesh:get output-mesh.json        # saves meshConfig to file
aio api-mesh:get --active                # last successfully deployed config
aio api-mesh:get --json                  # machine-readable output
```

---

#### `aio api-mesh:describe`
Show mesh metadata: Org ID, Project ID, Workspace ID, Mesh ID, and Mesh Endpoint URL.

| Flag | Short | Description |
|------|-------|-------------|
| `--ignoreCache` | `-i` | Bypass cached selection |

```bash
aio api-mesh:describe
```

---

#### `aio api-mesh:delete`
Delete the mesh for the selected org/project/workspace.

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--ignoreCache` | `-i` | Bypass cached selection | false |
| `--autoConfirmAction` | `-c` | Skip confirmation prompt | false |

```bash
aio api-mesh:delete
aio api-mesh:delete -c    # no prompt, useful in CI
```

---

#### `aio api-mesh:status`
Show the current build and deployment status of the mesh (`pending`, `building`, `success`, `error`, `provisioning`, etc.).

| Flag | Short | Description |
|------|-------|-------------|
| `--ignoreCache` | `-i` | Bypass cached selection |

```bash
aio api-mesh:status
```

---

### Local Development

#### `aio api-mesh:run [mesh.json]`
Build and run a local development server backed by Wrangler (Cloudflare Workers runtime). Requires `package.json` in the current directory — run `aio api-mesh:init` first.

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--port` | `-p` | Port for the local dev server | `5000` |
| `--inspectPort` | `-i` | Port for the Node.js inspector | `9229` |
| `--debug` | — | Enable debugging mode (disables JS minification) | false |
| `--env` | `-e` | Path to `.env` file for placeholder interpolation | `.env` |
| `--autoConfirmAction` | `-c` | Skip file import confirmation prompts | false |
| `--select` | — | Download and run the remote mesh artifact instead of building locally | false |
| `--secrets` | `-s` | Path to secrets YAML file for local dev | — |

```bash
aio api-mesh:run mesh.json
aio api-mesh:run mesh.json --port 3000 --debug
aio api-mesh:run mesh.json --secrets secrets.yaml
aio api-mesh:run --select      # use the deployed mesh artifact from remote
```

> Port can also be set via `PORT` and `INSPECT_PORT` environment variables in the `.env` file; CLI flags take precedence.

---

### Cache

#### `aio api-mesh:cache:purge`
Purge the cache for the mesh. The `-a/--all` flag is **required**.

| Flag | Short | Description | Required |
|------|-------|-------------|----------|
| `--all` | `-a` | Purge all cache data | yes |
| `--ignoreCache` | `-i` | Bypass cached selection | no |
| `--autoConfirmAction` | `-c` | Skip confirmation prompt | no |

```bash
aio api-mesh:cache:purge --all
aio api-mesh:cache:purge --all -c    # no prompt
```

---

### Logging

#### `aio api-mesh:log-list`
List recent request logs for the mesh (tabular output: Ray ID, Timestamp, Response Status, Level).

| Flag | Short | Description |
|------|-------|-------------|
| `--ignoreCache` | `-i` | Bypass cached selection |
| `--filename` | — | Export logs to a `.csv` file (file must not already exist) |

```bash
aio api-mesh:log-list
aio api-mesh:log-list --filename recent-logs.csv
```

---

#### `aio api-mesh:log-get <rayId>`
Fetch a single request log entry by its Ray ID.

| Flag | Short | Description |
|------|-------|-------------|
| `--ignoreCache` | `-i` | Bypass cached selection |

```bash
aio api-mesh:log-get <RAY_ID>
```

Output fields: Event Timestamp, Exceptions, Logs, Outcome, Mesh ID, RayId, Mesh URL, Request Method, Response Status.

---

#### `aio api-mesh:log-get-bulk`
Download all mesh request logs for a time range to a CSV file.

| Flag | Short | Description | Required |
|------|-------|-------------|----------|
| `--filename` | — | Output `.csv` file path (must be empty if it exists) | yes |
| `--startTime` | — | Start time in UTC (`YYYY-MM-DDTHH:MM:SSZ`) | with `--endTime` |
| `--endTime` | — | End time in UTC (`YYYY-MM-DDTHH:MM:SSZ`) | with `--startTime` |
| `--past` | — | Download logs from the past N minutes (e.g. `30m`) | alt to start/end |
| `--ignoreCache` | `-i` | Bypass cached selection | no |

```bash
aio api-mesh:log-get-bulk --startTime 2024-01-01T00:00:00Z --endTime 2024-01-01T00:30:00Z --filename logs.csv
aio api-mesh:log-get-bulk --past 30m --filename logs.csv
```

> Either `--startTime` + `--endTime` together, or `--past` alone — not a mix. The CLI confirms the estimated download size before writing.

---

### Log Forwarding

Log forwarding lets you ship mesh logs to an external destination (e.g. New Relic). The CLI encrypts sensitive credentials (license key / HEC token) with the org's public key before storing them.

#### `aio api-mesh:config:set:log-forwarding`
Interactively configure a log forwarding destination. Prompts for destination type, base URI, and credential (encrypted at rest).

| Flag | Short | Description |
|------|-------|-------------|
| `--ignoreCache` | `-i` | Bypass cached selection |
| `--autoConfirmAction` | `-c` | Skip confirmation prompt |
| `--json` | — | Output result as JSON |

```bash
aio api-mesh:config:set:log-forwarding
```

---

#### `aio api-mesh:config:get:log-forwarding`
Retrieve the current log forwarding configuration for the mesh.

| Flag | Short | Description |
|------|-------|-------------|
| `--ignoreCache` | `-i` | Bypass cached selection |
| `--json` | — | Output result as JSON |

```bash
aio api-mesh:config:get:log-forwarding
```

---

#### `aio api-mesh:config:get:log-forwarding:errors`
Download log forwarding error logs (delivery failures to the configured destination).

| Flag | Short | Description |
|------|-------|-------------|
| `--ignoreCache` | `-i` | Bypass cached selection |
| `--filename` | — | Save errors to a `.csv` file; prints to console if omitted |

```bash
aio api-mesh:config:get:log-forwarding:errors
aio api-mesh:config:get:log-forwarding:errors --filename forwarding-errors.csv
```

---

#### `aio api-mesh:config:delete:log-forwarding`
Remove the log forwarding configuration for the mesh.

| Flag | Short | Description |
|------|-------|-------------|
| `--ignoreCache` | `-i` | Bypass cached selection |
| `--autoConfirmAction` | `-c` | Skip confirmation prompt |

```bash
aio api-mesh:config:delete:log-forwarding
```

---

### Source Registry

Pre-built source configurations from the [Adobe API Mesh Sources Registry](https://github.com/adobe/api-mesh-sources/).

#### `aio api-mesh:source:discover`
List all available sources in the registry (tabular: name, latest version, description, all versions). Optionally install one or more sources interactively.

| Flag | Short | Description |
|------|-------|-------------|
| `--confirm` / `-c` | `-c` | Auto confirm install prompt |

```bash
aio api-mesh:source:discover
```

---

#### `aio api-mesh:source:get`
Fetch a source config and copy it to the clipboard (optionally print to console).

| Flag | Short | Description |
|------|-------|-------------|
| `--source` | `-s` | Source name (repeatable for multiple sources) |
| `--multiple` | `-m` | Interactive multi-select from the registry |
| `--confirm` | `-c` | Auto confirm print-to-console prompt |

```bash
aio api-mesh:source:get -s <SOURCE_NAME>
aio api-mesh:source:get -s <SOURCE_NAME>@<VERSION>
aio api-mesh:source:get -m                           # interactive picker
```

---

#### `aio api-mesh:source:install [source]`
Install one or more sources directly into the current mesh (calls `update` internally).

| Flag | Short | Description |
|------|-------|-------------|
| `--source` | `-s` | Source name (repeatable) |
| `--variable` | `-v` | Variable substitution `KEY=VALUE` (repeatable) |
| `--variable-file` | `-f` | Path to a JSON file with variable substitutions |
| `--confirm` | `-c` | Auto confirm override prompt if source already exists |
| `--ignoreCache` | `-i` | Bypass cached selection |

```bash
aio api-mesh:source:install <SOURCE_NAME>
aio api-mesh:source:install <SOURCE_NAME>@<VERSION>
aio api-mesh:source:install <SOURCE_NAME> -v BASE_URL=https://example.com -v API_KEY=abc123
aio api-mesh:source:install <SOURCE_NAME> -f variables.json
```
