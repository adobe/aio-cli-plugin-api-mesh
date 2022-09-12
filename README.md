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
    "apiKey": "<api_key>",
    "sourceRegistry: {
        "path": "<path_to_the_source_registry_storage>"
    }
}
```

2. Perform the following command to update the configuration

```
aio config:set api-mesh.configPath <path_to_json_file>
```

# Commands

```
aio api-mesh:describe
aio api-mesh:get
aio api-mesh:get PATH_OF_FILE_TO_DOWNLOAD_INTO
aio api-mesh:create PATH_OF_MESH_CONFIG_JSON_FILE
aio api-mesh:update PATH_OF_MESH_CONFIG_JSON_FILE
aio api-mesh:delete
```

All commands support `-i` or `--ignoreCache` flag that will force the CLI to ignore the cached Org, Project and Workspace details and prompt the user to select new options just for that action.

Create, Update and Delete support `-c` or `--autoConfirmAction` flag that will not prompt the user for action confirmation mostly used for testing or scaffolding where user prompt can not be handled. This flag is only to be used in certain situations.

# Sources Registry

Source registry is a collection of predefined sources (API mesh source configurations) that are created to solve specific use cases. The source can be installed for customer-specific API mesh configuration. 

To submit a new source, please follow the instructions provided in the [Source Registry](https://github.com/adobe/api-mesh-sources/) repository.


## Commands

```
aio api-mesh:source:get 
NAME_OF_THE_SOURCE
aio api-mesh:source:get NAME_OF_THE_SOURCE@VERSION_OF_THE_SOURCE
aio api-mesh:source:get -m 
aio api-mesh:source:discover
```

The "source:get" command accept multiple sources per one call.

Example:
```
aio api-mesh:source:get -m <NAME_OF_THE_SOURCE>@<VERSION_OF_THE_SOURC><NAME_OF_THE_SECOND_SOURCE>@<VERSION_OF_THE_SOURC>
<NAME_OF_THE_THIRD_SOURCE>@<VERSION_OF_THE_SOURC>
```