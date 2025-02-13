/**
 * CF-Connecting-IP provides the client IP address connecting to Cloudflare to the origin web server. This header will only be sent on the
 * traffic from Cloudflare’s edge to your origin web server. Upstream requests will the Cloudflare Worker client IP address of
 * `2a06:98c0:3600::103`.
 * @see https://developers.cloudflare.com/fundamentals/reference/http-request-headers/#cf-connecting-ip
 */
const CF_CONNECTING_IP_HEADER = 'cf-connecting-ip';

/**
 * The X-Forwarded-For (XFF) request header is a de-facto standard header for identifying the originating IP address of a client connecting
 * to a web server through a proxy server.
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-For
 */
const X_FORWARDED_FOR_HEADER = 'x-forwarded-for';

/**
 * Add `x-forwarded-for` header from request context to each fetch.
 * @param context Request context.
 * @param headers Fetch headers.
 */
const addXForwardedForHeader = (context, headers) => {
	// `cf-connecting-ip` header contains the original visitor's IP address
	const connectingIp = context?.request.headers.get(CF_CONNECTING_IP_HEADER);
	const xForwardedFor = context?.request.headers.get(X_FORWARDED_FOR_HEADER);
	if (connectingIp) {
		if (!xForwardedFor) {
			// Construct new `x-forwarded-for` header if not present in original request
			headers.set(X_FORWARDED_FOR_HEADER, connectingIp);
		} else {
			// Construct `x-forwarded-for` header using original header
			headers.set(X_FORWARDED_FOR_HEADER, `${xForwardedFor}, ${connectingIp}`);
		}
	}
};

/**
 * Adds compliance headers to source fetch requests.
 */
function useComplianceHeaders() {
	return {
		onFetch({ context, options }) {
			// Construct mutable headers from options passed to each fetch
			const headers = new Headers(options.headers);
			addXForwardedForHeader(context, headers);
			options.headers = headers;
		},
	};
}

module.exports = {
	useComplianceHeaders,
	CF_CONNECTING_IP_HEADER,
	X_FORWARDED_FOR_HEADER,
	addXForwardedForHeader,
};
