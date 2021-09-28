const { Command } = require('@oclif/command')
const { readFile } = require('fs/promises')

const { SchemaServiceClient } = require('../../../classes/SchemaServiceClient')

class CreateCommand extends Command {
  static args = [
    {arg: 'file'}
  ]
  async run() {
    const { args } = this.parse(CreateCommand)
    let schemaServiceClient = new SchemaServiceClient()
    let data
    try {
        data = JSON.parse(await readFile(args.file, "utf8"));
    } catch (error) {
        console.log(error)
    } 
    const tenant = await schemaServiceClient.createTenant(data)
    console.log(`Successfully created a tenant with the id: ${data.tenantId}`)
  }
}

CreateCommand.description = `Create a tenant with the given config.`

module.exports = CreateCommand
