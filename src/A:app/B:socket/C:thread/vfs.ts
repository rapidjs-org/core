
import { join } from "path";
import { statSync, existsSync, readFileSync } from "fs";
import { createHash } from "crypto";

import { normalizePath } from "../../../util";

import { PROJECT_CONFIG } from "../../config/config.project";

import { LimitedDictionary } from "./LimitedDictionary";


// TODO: Examine effect of cache proxy (temporary limited storage) in front of vfs

interface FileStamp {
    contents: string,
    eTag: string
}

class VirtualFileSystem extends LimitedDictionary<number, FileStamp> {

    constructor() {
        super(null, normalizePath);
    }

    private retrieveLocalPath(path: string): string {
        return normalizePath(join(PROJECT_CONFIG.read("webDirectory").string, path));
    }

    protected validateLimitReference(mtimeMs: number, path: string) {
        return (statSync(this.retrieveLocalPath(path)).mtimeMs == mtimeMs);
    }

    public read(path: string): string {
        let data: FileStamp = super.get(path);
        if(data === undefined) {
            // Try to write if intially not found
            this.write(path);

            data = super.get(path);
        }

        return (super.get(path) || {}).contents;
    }

    public write(path: string) {
        const localPath: string = this.retrieveLocalPath(path);

        if(!existsSync(localPath)) {
            return;
        }

        const fileContents: string = String(readFileSync(localPath));

        const data: FileStamp = {
            contents: fileContents,
            eTag: computeETag(fileContents)
        };

        super.set(path, statSync(localPath).mtimeMs, data);
    }

}


function computeETag(fileContents: string): string {
    return createHash("md5").update(fileContents).digest("hex");
}


export const VFS = new VirtualFileSystem();