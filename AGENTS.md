# AGENTS.md — aio-cli-plugin-api-mesh

Adobe I/O CLI plugin (`@adobe/aio-cli-plugin-api-mesh`) for creating and managing API Mesh configurations.

---

## Repository Overview

This project is an [oclif](https://oclif.io/) plugin that extends the Adobe I/O CLI (`aio`). It lets developers create, update, and locally run API Meshes — GraphQL gateways that federate multiple upstream APIs into a single endpoint, powered by Cloudflare Workers.

**How it works end-to-end:**

1. The user writes a `mesh.json` file describing sources (REST, GraphQL, SOAP), transforms, hooks, and plugins.
2. The CLI validates and submits that config to the **Schema Management Service (SMS)** — the Adobe-hosted backend that builds and deploys the mesh to Cloudflare.
3. Once provisioned, the mesh is reachable at a Cloudflare-hosted GraphQL endpoint.
4. For local development, the CLI builds the mesh artifact with `@adobe-apimesh/mesh-builder` and runs it locally via Wrangler (Cloudflare Workers runtime).

URL constants for stage and prod live in `src/constants.js`. Switch to stage with `aio config set cli.env stage`; each constant can also be overridden by a matching environment variable.

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
**`src/lib/smsClient.js`** — all HTTP calls to SMS and Adobe Developer Console go through here. If SMS behaviour changes, start here.

### Auth and context resolution
**`src/helpers.js`** — `initSdk()` is the entry point for every command. Resolves the IMS token, looks up org/project/workspace via Dev Console, and caches the result.

### Secrets handling
Two separate responsibilities — easy to confuse:
- **`src/secrets.js`** — runtime: parses the encrypted secrets JSON from the `SECRETS` env var inside the running worker. A Proxy (`getSecretsHandler`) throws on access to undefined keys and blocks mutation.
- **`src/utils.js`** — build-time: `encryptSecrets()` encrypts secrets with the org's RSA public key; `validateSecretsFile()` reads and validates the YAML secrets file before submission.

### Plugin compatibility fix
**`src/fixPlugins.js`** — rewrites the compiled mesh `index.js` to redirect `@graphql-mesh/plugin-http-details-extensions` imports to a local fork. Run as a post-build step. Without this the worker fails at runtime with a missing module error.

---

## Conventions

### Command structure
- Every command calls `initSdk()` first to resolve org/project/workspace context.
- Destructive commands (`delete`, `update`, `cache:purge`, log-forwarding changes) always prompt for confirmation unless `--autoConfirmAction` (`-c`) is passed.
- Commands return a plain object from `run()` — oclif serialises it when `--json` is set. The return shape is consumed by downstream generators (`generator-app-api-mesh`), so don't rename return keys without checking what depends on them.
- Error messages always append `RequestId: ${global.requestId}` to aid support tracing.

### Module format
Most files are CommonJS (`require`/`module.exports`). `src/worker.js` and `src/state.js` are ESM (`import`/`export`) because they run inside the Cloudflare Workers runtime, which requires ESM. Do not mix formats within a file.

### Testing
Tests mock `src/helpers.js` and `src/lib/smsClient.js` entirely with `jest.mock()` — no real network calls. Fixtures live in `src/commands/__fixtures__/`. New shared flags go in `src/utils.js`, not inline in the command file.

### Logging
The pino logger (`src/classes/logger.js`) is **off by default**. Enable with `ENABLE_LOGGER=true`; set level with `LOG_LEVEL` (default `info`). Use `logger.info/debug/error`, not `console.log`, except in `src/worker.js` and `src/fixPlugins.js` which run outside the logger context.

### Secrets
Secrets files are YAML. Limits (max count and max size) are enforced in `src/constants.js`. Secrets are encrypted client-side before transmission — the plain-text YAML file must never be committed or logged.

---

## Critical Gotchas

### 1. Command `run()` return shape is consumed by external generators
Commands return a plain object from `run()`. `generator-app-api-mesh` and other downstream tools depend on specific key names in these return objects. Renaming a return key (e.g. `meshId` → `id`) is a silent breaking change for those consumers. Check for downstream usage before renaming.

### 2. `aio api-mesh:run --select` skips the local build entirely
Without `--select`, `run` builds the mesh artifact locally from the provided `mesh.json`. With `--select`, it downloads the currently deployed remote artifact and runs that instead — no local build. The two modes behave very differently; passing `--select` with a local `mesh.json` file will silently ignore the file.

### 3. `initSdk()` caches org/project/workspace selection to disk
`initSdk()` writes the resolved org/project/workspace to a local cache file. Subsequent command invocations reuse the cached values without prompting. If the context seems wrong (wrong org, wrong project), pass `--ignoreCache` (`-i`) to force re-selection. The cache persists across terminal sessions.

### 4. Placeholder interpolation happens before submission — missing vars silently become empty strings
`interpolateMesh()` replaces `${VAR}` tokens in `mesh.json` using the `.env` file. If a variable is referenced in `mesh.json` but missing from `.env`, the token is replaced with an empty string without error. The mesh will be submitted with an empty value, which may cause a build failure in SMS with a misleading error.
