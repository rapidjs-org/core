/**
 * Network applied HTTP status codes enumeration.
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
    PRECONDITION_FAILED = 412,

    // Server error codes
    INTERNAL_ERROR = 500
}