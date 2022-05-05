import { createHash } from "crypto";


export function computeETag(fileContents: string): string {
	return createHash("md5").update(fileContents).digest("hex");
}