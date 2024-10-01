# Adobe API Mesh

API Mesh enables developers to integrate third-party APIs with other Adobe products, like App Builder, Adobe IO Gateway, or other serverless technologies.

Use this repo to bootstrap Adobe API Mesh development with ease. Use this repo to test, create and maintain meshes on your local and GitHub codespaces.

This repo comes with all the files and dependencies necessary to get started with API Mesh.

# Local Dev

`yarn start mesh.json` - to start the local dev server in watch mode

`yarn debug mesh.json` - to start the local dev server in debug mode

`yarn aio api-mesh run mesh.json` - to start the local dev server in non-watch mode

`yarn aio api-mesh run mesh.json --debug` - to start the local dev server in non-watch debug mode

`yarn test:perf` - to start the Performance Testing process locally for development. Make sure to update the `MESH_ENDPOINT` in the `test:perf` command located in the `package.json`

# Documentation

Check out the [documentation](https://developer.adobe.com/graphql-mesh-gateway/mesh/basic/create-mesh/) for further details on how to create and maintain meshes.
