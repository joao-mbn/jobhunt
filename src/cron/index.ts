import cron from "node-cron";
import { main as extract } from "../extract/index.ts";
import { main as load } from "../load/index.ts";
import { main as clean } from "../transform/clean/index.ts";
import { main as enhance } from "../transform/enhance/index.ts";
import { main as prefills } from "../transform/prefills/index.ts";

function main() {
  console.log("🚀 Starting cron process...");

  process.on("SIGINT", () => {
    console.log("Received SIGINT signal. Stopping cron process...");

    cron.getTasks().forEach((task) => {
      console.log("🔄 Stopping cron task", task.name);
      task.destroy();
    });

    process.exitCode = 0;
  });

  cron.schedule(
    "*/30 * * * *", // Every 30 minutes
    (context) => {
      console.log("🔄 Running cron job for extraction at", context.date);
      extract();
    },
    { name: "extract" },
  );

  cron.schedule(
    "0-59/6 * * * *", // Every 6 minutes, starting at 0 minute
    (context) => {
      console.log("🔄 Running cron job for cleaning at", context.date);
      clean();
    },
    { name: "clean" },
  );

  cron.schedule(
    "2-59/6 * * * *", // Every 6 minutes, starting at 2 minute
    (context) => {
      console.log("🔄 Running cron job for enhancement at", context.date);
      enhance();
    },
    { name: "enhance" },
  );

  cron.schedule(
    "4-59/6 * * * *", // Every 6 minutes, starting at 4 minutes
    (context) => {
      console.log("🔄 Running cron job for prefills at", context.date);
      prefills();
    },
    { name: "prefills" },
  );

  cron.schedule(
    "15-59/30 * * * *", // Every 30 minutes, starting at 15 minutes
    (context) => {
      console.log("🔄 Running cron job for loading at", context.date);
      load();
    },
    { name: "load" },
  );
}

if (import.meta.main) {
  main();
}
