import { PrismaClient } from "@prisma/client";
import { logger } from "./logging";

export const prismaClient = new PrismaClient({
  log: [
    {
      emit: "event",
      level: "query",
    },
    {
      emit: "event",
      level: "error",
    },
    {
      emit: "event",
      level: "info",
    },
    {
      emit: "event",
      level: "warn",
    },
  ],
});

// Define a custom type for the log event
type LogEvent = {
  timestamp: Date;
  message: string;
  target: string;
};

prismaClient.$on("error", (e: LogEvent) => {
  logger.error(e);
});

prismaClient.$on("warn", (e: LogEvent) => {
  logger.warn(e);
});

prismaClient.$on("info", (e: LogEvent) => {
  logger.info(e);
});
