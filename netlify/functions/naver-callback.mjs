import { handle } from "../lib/entry.mjs";
export const handler = (event) => handle("naver-callback", event);
