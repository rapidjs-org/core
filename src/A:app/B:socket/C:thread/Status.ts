
/**
 * Application wide supported status codes with descriptive names.
 */
export enum Status {
    SUCCESS = 200,

    REDIRECT = 301,
    USE_CACHE = 304,

    FORBIDDEN = 403,
    NOT_FOUND = 404,
    UNSUPPORTED_METHOD = 405,
    TIMEOUT = 408,
    URL_EXCEEDED = 414,
    RATE_EXCEEDED = 429,

    INTERNAL = 500
}