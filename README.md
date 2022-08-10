# Installation

Prerequisites: [node.js](https://nodejs.org/en/), [aio-cli](https://github.com/adobe/aio-cli).
To install a revision from this repository:

```
$ aio plugins:install @adobe/aio-cli-plugin-api-mesh
```

To install globally from a released npm package:

```
$ aio plugins:install -g @adobe/aio-cli-plugin-api-mesh
```

To discover available aio packages:

```
$ aio discover -i
```

### Local Development

Install project dependencies. `npm install`

```
aio plugins:link api-mesh
```

### Configuration

The plugin comes out of the box with configurations for stage and prod. The plugin by default connects to PROD dev console. To connect to STAGE instead:

1. Clear your config before switching the env

```
aio config clear
```

2. Switch to stage environment
```
aio config set cli.env stage
```

#### Custom Configuration

If you want to have custom configuration instead, please follow the steps below:

1. create a config.json file with the following parameters

```
{
    "baseUrl": "<base_url>",
    "apiKey": "<api_key>"
}
```

2. Perform the following command to update the configuration

```
aio config:set api-mesh.configPath <path_to_json_file>
```

# Commands

```
aio api-mesh:describe
aio api-mesh:get meshId
aio api-mesh:get meshId PATH_OF_FILE_TO_DOWNLOAD_INTO
aio api-mesh:create PATH_OF_MESH_CONFIG_JSON_FILE
aio api-mesh:update meshId PATH_OF_MESH_CONFIG_JSON_FILE
aio api-mesh:delete meshId
```
