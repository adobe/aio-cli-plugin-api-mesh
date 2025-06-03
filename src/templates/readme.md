# Adobe API Mesh

API Mesh enables developers to integrate third-party APIs with other Adobe products, like App Builder, Adobe IO Gateway, or other serverless technologies.

Use this repo to bootstrap Adobe API Mesh development with ease. Use this repo to test, create and maintain meshes on your local and GitHub codespaces.

This repo comes with all the files and dependencies necessary to get started with API Mesh.

1. `mesh.json` - sample mesh config with a single source
2. `.env` - environment file with variables for the config presented in mesh.json
3. `package.json` - dependencies and scripts to test and deploy meshes
4. `.vscode/launch.json` - VS Code configuration to setup debugging out of the box. This applies to VS Code on local machines or Codespaces on Github.com
5. `.devcontainer/devcontainer.json` - Codespaces configuration to setup dev container out of the box. This config will help setup the packages and build the mesh config automatically. As a bonus it also sets up port-forwarding so you can use your favourite GraphQL interface to practice the mesh
6. `.github/workflows/deployMesh.yaml` - Github workflow to automatically publish mesh config when something is committed to `main`

# Local Dev

`yarn start mesh.json` - to start the local dev server in watch mode

`yarn debug mesh.json` - to start the local dev server in debug mode

`yarn aio api-mesh run mesh.json` - to start the local dev server in non-watch mode

`yarn aio api-mesh run mesh.json --debug` - to start the local dev server in non-watch debug mode

`yarn test:perf` - to start the Performance Testing process locally for development. Make sure to update the `MESH_ENDPOINT` in the `test:perf` command located in the `package.json`

# Setup Github Workflows

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

# Documentation

Check out the [documentation](https://developer.adobe.com/graphql-mesh-gateway/mesh/basic/create-mesh/) for further details on how to create and maintain meshes.
