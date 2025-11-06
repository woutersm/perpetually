import { consola } from "consola";

export const logger = consola.create({
  level: process.env.NODE_ENV === "development" ? 4 : 3,
  formatOptions: {
    colors: true,
    date: true,
    compact: false,
  },
});
