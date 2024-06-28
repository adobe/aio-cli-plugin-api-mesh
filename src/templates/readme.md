# API Mesh Starter Kit

Bootstrap your API Mesh development with ease.

Simply use the template to create a new repo and get started with Github Codespaces to write, test and deploy all from the browser.

This repo comes with all the files necessary to get started with API Mesh:

1. `mesh.json` - sample mesh config with a single source
2. `.env` - environment file with variables for the config presented in mesh.json
3. `package.json` - dependencies and scripts to test and deploy meshes
4. `.vscode/launch.json` - VS Code configuration to setup debugging out of the box. This applies to VS Code on local machines or Codespaces on Github.com
5. `.devcontainer/devcontainer.json` - Codespaces configuration to setup dev container out of the box. This config will help setup the packages and build the mesh config automatically. As a bonus it also sets up port-forwarding so you can use your favourite GraphQL interface to practice the mesh
6. `.github/workflows/deployMesh.yml` - Github workflow to automatically publish mesh config when something is committed to `main`

## Setup Local Development

Clone the repo to your local machine and run `yarn install` to automatically setup required packages, `aio` and `api-mesh` plugins.

To run the mesh config presented in `mesh.json`, run `yarn start mesh.json` to build and run the local mesh server.

## Setup Remote Development (Codespaces)

Click on the Green Code button in the repo page and switch to Codespaces. Then click the `Create codespaces on main` button to automatically create a codepsace with default config from the template.

It is also possible to create a codespace with custom configuration, follow the [Github Codepsaces guide](https://docs.github.com/en/codespaces/getting-started/quickstart) for more information.

## Setup Github Workflows

This repo comes with CICD out of the box but it will need Github Secrets to deploy meshes.

Please add the following secrets to the repo upon setup. Follow the [CICD guide](https://developer.adobe.com/graphql-mesh-gateway/gateway/cicd/) to learn more about acquiring the required secrets.

1. API_KEY
2. CLIENTID
3. CLIENTSECRET
4. IMSORGID
5. ORGID
6. PROJECTID
7. TECHNICALACCEMAIL
8. TECHNICALACCID
9. WORKSPACEID
