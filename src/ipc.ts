
export function conduct(signal: number, data: Record<string, any>) {
    process.send({
        signal: signal,
        data: data
    } as MessageIPC);
}