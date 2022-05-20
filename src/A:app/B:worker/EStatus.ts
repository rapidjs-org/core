
/**
 * Application wide supported status codes with descriptive names.
 */
export enum EStatus {
    // Success codes
    SUCCESS = 200,
    PARTIAL_INFORMATION = 203,

    // Redirection codes
    REDIRECT = 301,
    USE_CACHE = 304,

    // Client error codes
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    UNSUPPORTED_METHOD = 405,
    NOT_ACCEPTABLE  = 406,
    REQUEST_TIMEOUT = 408,  // TODO: Implement broadly
    PRECONDITION_FAILED = 412,
    PAYLOAD_TOO_LARGE = 413,
    URL_EXCEEDED = 414,
    RATE_EXCEEDED = 429,

    // Server error codes
    INTERNAL_ERROR = 500,
    SERVICE_UNAVAILABKLE = 503
}