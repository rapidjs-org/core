/**
 * Network applied HTTP status codes enumeration.
 */


export enum EStatus {
    // Success codes
    SUCCESS = 200,

    // Redirection codes
    REDIRECT = 301,

    // Client error codes
    REQUEST_TIMEOUT = 408,  // TODO: Implement broadly
    PRECONDITION_FAILED = 412,
    PAYLOAD_TOO_LARGE = 413,
    URL_EXCEEDED = 414,
    RATE_EXCEEDED = 429,

    // Server error codes
    INTERNAL_ERROR = 500,
    SERVICE_UNAVAILABLE = 503
}