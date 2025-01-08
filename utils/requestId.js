const UUID = require('../src/uuid');

/**
 * Default request identifier header name.
 */
const DEFAULT_REQUEST_ID_HEADER_NAME = 'x-request-id';

/**
 * Get request identifier from headers. Will attempt to set request identifier if not present.
 * @param request Request.
 * @param headerName Request identifier header name.
 */
function getRequestId(request, headerName = DEFAULT_REQUEST_ID_HEADER_NAME) {
	let requestId = request.headers.get(headerName);
	if (!requestId) {
		requestId = UUID.newUuid().toString();
		try {
			request.headers.set(headerName, requestId);
		} catch (err) {
			// Unable to set request headers
		}
	}
	return requestId;
}

module.exports = { DEFAULT_REQUEST_ID_HEADER_NAME, getRequestId };
