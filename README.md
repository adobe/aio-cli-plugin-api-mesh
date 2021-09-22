# Installation
Prerequisites: [node.js](https://nodejs.org/en/), [aio-cli](https://github.com/adobe/aio-cli).
To install a revision from this repository:

```
$ aio plugins:install adobe/aio-cli-plugin-schema-management
```

To install globally from a released npm package:

```
$ aio plugins:install -g @adobe/aio-cli-plugin-schema-management
```

To discover available aio packages:

```
$ aio discover -i
```
### Local Development

Install project dependencies. ```npm install```
```
aio plugins:link schema-management/tenant/list
```

# Commands
<!-- commands -->
```aio schema-management:tenant:list```
<!-- commandsstop -->

# Env variables
For local development, the project is configured to look for a .env file at the project root for environment variables. Git is configured to ignore .env and it should not be checked into the repo.

SCHEMA_MANAGEMENT_SERVICE_URL

http://localhost:8080 default local address
https://schema-management-service-qa.corp.ethos01-stage-va6.ethos.adobe.net qa endpoint (must be on VPN)
LOG_LEVEL

default 500
EXTERNAL_API_TIMEOUT - Timeout for async calls to external APIs (ms)

default 1000
EXTERNAL_API_RETRY - Number of retries for async calls to external APIs
