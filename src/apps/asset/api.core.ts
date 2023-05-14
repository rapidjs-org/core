import { VFS as CoreVFS } from "../../core/process/thread/VFS"; // TODO: s.b.

import { TConcreteAppAPI } from "../../_types";


export let API: TConcreteAppAPI = null;

export let VFS: CoreVFS = null; // TODO: Typings


export function define(apiObj: TConcreteAppAPI) {
    API = apiObj;

    VFS = new apiObj.VFS("./web");
}