import winston from "winston";

export const logger = winston.createLogger({
  level: "warn",
  format: winston.format.json(),
  transports: [new winston.transports.Console({})],
});