import { cache } from "react";

/** A single "now" per render (request-scoped via React.cache). */
export const getNow = cache(() => new Date());
