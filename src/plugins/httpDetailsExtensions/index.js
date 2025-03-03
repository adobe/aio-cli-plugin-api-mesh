/**
 * Fork of https://github.com/ardatan/graphql-mesh/blob/%40graphql-mesh/plugin-http-details-extensions%400.1.21/packages/plugins/http-details-extensions/src/index.ts
 * Version: 0.1.21
 * TODO: Extract to a separate repository/artifact after approach has been validated.
 */

/* eslint-disable */

const { isAsyncIterable } = require('@envelop/core');
const { getHeadersObj } = require('@graphql-mesh/utils');

function useIncludeHttpDetailsInExtensions(opts) {
	if (!opts.if) {
		return {};
	}

	const httpDetailsByContext = new WeakMap();

	function getHttpDetailsByContext(context) {
		let httpDetails = httpDetailsByContext.get(context);
		if (!httpDetails) {
			httpDetails = [];
			httpDetailsByContext.set(context, httpDetails);
		}
		return httpDetails;
	}

	return {
		onFetch({ url, context, info, options }) {
			if (context != null) {
				const requestTimestamp = Date.now();
				return ({ response }) => {
					const responseTimestamp = Date.now();
					const responseTime = responseTimestamp - requestTimestamp;
					const httpDetailsList = getHttpDetailsByContext(context);
					const httpDetails = {
						sourceName: info?.sourceName,
						path: info?.path,
						request: {
							timestamp: requestTimestamp,
							url,
							method: options.method || 'GET',
							headers: getHeadersObj(options.headers),
						},
						response: {
							timestamp: responseTimestamp,
							status: response.status,
							statusText: response.statusText,
							headers: getHeadersObj(response.headers),
							// Added to interface to account for edge fetch implementation/behavior
							cookies: response.headers.getSetCookie(),
						},
						responseTime,
					};
					httpDetailsList.push(httpDetails);
				};
			}
			return undefined;
		},
		onExecute({ args: { contextValue } }) {
			return {
				onExecuteDone({ result, setResult }) {
					if (!isAsyncIterable(result)) {
						const httpDetailsList = httpDetailsByContext.get(contextValue);
						if (httpDetailsList != null) {
							setResult({
								...result,
								extensions: {
									...result.extensions,
									httpDetails: httpDetailsList,
								},
							});
						}
					}
				},
			};
		},
	};
}

module.exports = useIncludeHttpDetailsInExtensions;
