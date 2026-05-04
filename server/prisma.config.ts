// prisma.config.ts
//import { defineConfig } from "prisma/config file";

// export default defineConfig({
//   migrations: {
//     seed: "ts-node prisma/seed.ts",
//   },
// });

export default {
  migrations: {
    seed: "ts-node prisma/seed.ts",
  },
};