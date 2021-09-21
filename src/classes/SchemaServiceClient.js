const got = require('got')

class SchemaServiceClient {
    constructor() {
        this.schemaManagementServiceUrl = process.env.SCHEMA_MANAGEMENT_SERVICE_URL
        this.lastUpdated = ''
        this.timeout = parseInt(process.env.EXTERNAL_API_TIMEOUT || '1000', 10)
        this.retryCount = parseInt(process.env.EXTERNAL_API_RETRY || '2', 10)
    }
    getTenantsForUpdate = async () => {
        try {
            const response = await got(`${this.schemaManagementServiceUrl}/tenants`, {
				method: 'GET',
				responseType: 'json',
				searchParams: {
					lastUpdated: this.lastUpdated,
				},
				timeout: this.timeout,
				retry: this.retryCount,
            })
            if (response) 
            console.log(response.body);
            
        } catch (error) {
            console.log(error.response.body);
        }
    }
}

module.exports = { SchemaServiceClient }
