import { statSync } from "fs";
import { join, normalize } from "path";

import { LimitDictionary } from "./LimitDictionary";


interface IFileReference {
    ctime: number;
    mtime: number;
}

interface IFileStamp {
    ETag: string;
    data: string;
}


export class VFS extends LimitDictionary<string, IFileStamp, IFileReference> {

    private readonly root: string;

    constructor(root: string) { // TODO: Default from config
        super((path: string) => {
            return normalize(path);
        });

        this.root = root;
    }

    private getAbsolutePath(path: string): string {
        return join(this.root, path);   // TODO: Resolve project locally / from main
    }

    private getFileReference(path: string): IFileReference {
        const {
            ctimeMs, mtimeMs    // ns for precision ?
        } = statSync(this.getAbsolutePath(path));

        return {
            ctime: ctimeMs,
            mtime: mtimeMs
        }
    }

    protected retrieveReferenceCallback(path: string): IFileReference {
        return this.getFileReference(path);
    }

    protected validateLimitCallback(reference: IFileReference, current: IFileReference): boolean {
        return (reference.ctime !== current.ctime
            || reference.mtime !== current.mtime);
    }

    public write(): Promise<void> {
        throw new SyntaxError("write() is not a member of VFS, use writeDisc() or writeVirtual() instead");
    }

    public writeVirtual(path: string, data: string) {
        const eTag: string = "";

        const fileStamp: IFileStamp = {
            ETag: eTag,
            data: data
        };

        return super.write(path, fileStamp);
    }

    public writeDisc(path: string, data: string) {
        // TODO: Write to file on disc

        return this.writeVirtual(path, data);
    }
}