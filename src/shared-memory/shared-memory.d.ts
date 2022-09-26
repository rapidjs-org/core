export declare function init(appKey: number): void;

export declare function write(purposeKey: string, purposeData: Buffer): Promise<void>;

export declare function read(purposeKey: string): Buffer;

export declare function free(): void;