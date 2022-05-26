# Installation

Prerequisites: [node.js](https://nodejs.org/en/), [aio-cli](https://github.com/adobe/aio-cli).
To install a revision from this repository:

```
$ aio plugins:install @adobe/aio-cli-plugin-commerce-admin
```

To install globally from a released npm package:

```
$ aio plugins:install -g @adobe/aio-cli-plugin-commerce-admin
```

To discover available aio packages:

```
$ aio discover -i
```

### Local Development

Install project dependencies. `npm install`

```
aio plugins:link commerce-gateway/tenant
```

### Configuration

create a config.json file with the following parameters

```
{
    "baseUrl": "<base_url>",
    "apiKey": "<api_key>"
}
```

Perform the following command to update the configuration

```
aio config:set aio-cli-plugin-commerce-admin <path_to_json_file>
```

# Commands

```
aio api-manager:mesh:get meshId
aio api-manager:mesh:get meshId PATH_OF_FILE_TO_DOWNLOAD_INTO
aio api-manager:mesh:create PATH_OF_MESH_CONFIG_JSON_FILE
aio api-manager:mesh:update meshId PATH_OF_MESH_CONFIG_JSON_FILE
aio api-manager:mesh:delete meshId
```
