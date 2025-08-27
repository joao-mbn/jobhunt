import { main } from "./index.ts";

Deno.cron("Run main function", "0 * * * *", main);
