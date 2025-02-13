/**
 * Header to indicate which tier served the request.
 */
const SERVE_TIER_HEADER = 'x-api-mesh-served';

/**
 * Tiers that served the request.
 */
const ServedTier = {
	WORKER_HOT: 0,
};

/**
 * Add the served header to the response. Requires mutable headers on the response object.
 * @param response Response.
 * @param servedTier Tier that served the request.
 */
const addServedHeader = (response, servedTier) => {
	response.headers.set(SERVE_TIER_HEADER, servedTier.toString());
};

module.exports = { ServedTier, addServedHeader };
