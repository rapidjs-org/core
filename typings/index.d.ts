
// APP

export declare function plugin(reference: string, options: {
    // TODO: Declare
}): void;

// COMMON

/* export declare namespace rapidJS {

    export class Cache<D> {
        constructor(duration?: number, normalizationCallback?: (key: string) => string);
        protected validateLimitReference(timestamp: number): boolean;
        has(key: string): boolean;
        read(key: string): D;
        write(key: string, data: D): void;
    }

    // MutualClientError, MutualServerError;
} */    // TODO: How to type JS native scopes?

// No plug-in interface typings due to JS nativity