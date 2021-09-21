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

## Contributing

Contributions are welcomed! Read the [Contributing Guide](CONTRIBUTING.md) for more information.

## Licensing

This project is licensed under the Apache V2 License. See [LICENSE](LICENSE) for more information.
