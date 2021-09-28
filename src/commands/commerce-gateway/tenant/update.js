const { Command } = require('@oclif/command')
const { readFile } = require('fs/promises')

const { SchemaServiceClient } = require('../../../classes/SchemaServiceClient')

class UpdateCommand extends Command {
  static args = [
    {name: 'tenantId'},
    {name: 'file'},
  ]
  async run() {
    const { args } = this.parse(UpdateCommand)
    const schemaServiceClient = new SchemaServiceClient()
    let data
    try {
      data = JSON.parse(await readFile(args.file, "utf8"))
      const tenant = await schemaServiceClient.updateTenant(args.tenantId, data)
      console.log(`Successfully updated the tenant with the id: ${data.tenantId}`)
    } catch (error) {
        console.log(error)
    } 
    
  }
}

UpdateCommand.description = `Update a tenant with the given config.`

module.exports = UpdateCommand
