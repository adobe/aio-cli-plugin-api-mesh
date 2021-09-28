const got = require('got')

class SchemaServiceClient {
    constructor() {
        this.schemaManagementServiceUrl = process.env.SCHEMA_MANAGEMENT_SERVICE_URL
        this.lastUpdated = ''
        this.timeout = parseInt(process.env.EXTERNAL_API_TIMEOUT || '1000', 10)
        this.retryCount = parseInt(process.env.EXTERNAL_API_RETRY || '2', 10)
    }
    getTenant = async (tenantId) => {
        try {
            const response = await got(`${this.schemaManagementServiceUrl}/tenants/${tenantId}`, {
				method: 'GET',
				responseType: 'json',
				searchParams: {
					lastUpdated: this.lastUpdated,
				},
				timeout: this.timeout,
				retry: this.retryCount,
            })
            return response && response.body ?
            response.body : null
            
        } catch (error) {
            console.error(error)
            return null
        }
    }

    createTenant = async (data) => {
        try {
            const response = await got(`${this.schemaManagementServiceUrl}/tenants`, {
				method: 'POST',
                responseType: 'json',
                headers: { 
                    'Content-Type': 'application/json'
                },
				body: JSON.stringify(data),
				timeout: this.timeout,
				retry: this.retryCount,
            })
            return response && response.body ?
            response.body : null
            
        } catch (error) {
            console.error(error)
            return null
        }
    }

    updateTenant = async (tenantId, data) => {
        try {
            const response = await got(`${this.schemaManagementServiceUrl}/tenants/${tenantId}`, {
				method: 'PUT',
                responseType: 'json',
                headers: { 
                    'Content-Type': 'application/json'
                },
				body: JSON.stringify(data),
				timeout: this.timeout,
				retry: this.retryCount,
            })
            return response && response.body ?
            response.body : null
            
        } catch (error) {
            console.error(error)
            return null
        }
    }
}

module.exports = { SchemaServiceClient }
