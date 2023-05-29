/**
 * Manifold influential data structure types.
 */


import { IRequest, IResponse, IHighlevelCookieOut } from "./_interfaces";


export type THeaders = Record<string, string|string[]>;

export type TJSONObject = { [ key: string ]: TJSONObject|string|number|boolean };

export type TResponseOverload = IResponse|number;

export type THighlevelCookieIn = Record<string, string|number|boolean>;

export type TCookies = Record<string, IHighlevelCookieOut>;

export type TConcreteAppHandler = (req: IRequest) => IResponse;