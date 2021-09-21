const { SchemaServiceClient } = require('../../../classes/SchemaServiceClient')
const {Command, flags} = require('@oclif/command')

class ListCommand extends Command {
  async run() {
    const {flags} = this.parse(ListCommand)
    let schemaServiceClient = new SchemaServiceClient()
    const tenants = await schemaServiceClient.getTenants()
    this.log(tenants)
  }
}

ListCommand.description = `Describe the command here
...
Extra documentation goes here
`

ListCommand.flags = {
  name: flags.string({char: 'n', description: 'name to print'}),
}

module.exports = ListCommand
