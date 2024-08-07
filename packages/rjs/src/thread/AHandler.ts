import EventEmitter from "events";
import zlib from "zlib";

import { ISerialRequest, ISerialResponse } from "../interfaces";
import { APP_CONFIG} from "./APP_CONFIG";
import { Request } from "./Request";
import { Response } from "./Response";

// TODO: i18n (?)

const ENCODERS: { [key: string]: (data: unknown) => Buffer } = Object.freeze({
	identity: (data: unknown) => data as Buffer,
	gzip: zlib.gzipSync,
	deflate: zlib.deflateSync,
	br: zlib.brotliCompressSync
});

export abstract class AHandler extends EventEmitter {
	protected readonly request: Request;
	protected readonly response: Response;

	private hasConsumedResponse: boolean = false;

	constructor(sReq: ISerialRequest) {
		super();

		this.request = new Request(sReq);
		this.response = new Response();
	}

	public respond() {
		if (this.hasConsumedResponse) throw new RangeError("Response consumed multiple times");
		this.hasConsumedResponse = true;

		if (
			this.response.hasCompressableBody &&
			(this.response.getBody() ?? "").toString().length >
				APP_CONFIG.read("performance", "compressionByteThreshold").number()
		) {
			const encoding: string =
				this.request
					.getWeightedHeader("Accept-Encoding")
					.filter((encoder: string) => ENCODERS[encoder])
					.shift() ?? "identity";

			this.response.setBody(ENCODERS[encoding](this.response.getBody()));
			this.response.setHeader("Content-Encoding", encoding);
		}

		const sRes: ISerialResponse = this.response.serialize();

		// Common headers
		this.response.setHeader("Content-Length", Buffer.byteLength(sRes.body ?? ""));
		this.response.setHeader("Connection", "keep-alive");
		this.response.setHeader(
			"Cache-Control",
			[
				`max-age=${APP_CONFIG.read("performance", "clientCacheMs").number()}`,
				"stale-while-revalidate=300",
				"must-revalidate"
			].join(", ")
		);

		this.emit("response", sRes);
	}

	public abstract process(): void;
}
