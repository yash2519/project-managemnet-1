import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
const prisma = new PrismaClient();

async function deleteAllData(orderedFileNames: string[]) {
  const modelNames = orderedFileNames.map((fileName) => {
    const modelName = path.basename(fileName, path.extname(fileName));
    return modelName.charAt(0).toUpperCase() + modelName.slice(1);
  }).reverse();

  for (const modelName of modelNames) {
    try {
      // Try both capitalized and lowercase table names just in case
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${modelName}" RESTART IDENTITY CASCADE;`);
      console.log(`Cleared data from ${modelName}`);
    } catch (error) {
      try {
        const lowerModelName = modelName.toLowerCase();
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${lowerModelName}" RESTART IDENTITY CASCADE;`);
        console.log(`Cleared data from ${lowerModelName}`);
      } catch (innerError) {
        console.error(`Error clearing data from ${modelName}:`, innerError);
      }
    }
  }
}

async function main() {
  const dataDirectory = path.join(__dirname, "seedData");

  const orderedFileNames = [
    "team.json",
    "user.json",
    "project.json",
    "projectTeam.json",
    "task.json",
    "attachment.json",
    "comment.json",
    "taskAssignment.json",
  ];

  await deleteAllData(orderedFileNames);

  for (const fileName of orderedFileNames) {
    const filePath = path.join(dataDirectory, fileName);
    const jsonData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const modelName = path.basename(fileName, path.extname(fileName));
    const model: any = prisma[modelName as keyof typeof prisma];

    if (!model) {
      console.error(`No model found for ${modelName}`);
      continue;
    }

    try {
      for (const data of jsonData) {
        if (modelName === "user" && data.teamId !== undefined) {
          const { teamId, ...rest } = data;
          await model.create({
            data: {
              ...rest,
              teamId: teamId
            }
          });
        } else {
          await model.create({ data });
        }
      }
      console.log(`Seeded ${modelName} with data from ${fileName}`);
    } catch (error) {
      console.error(`Error seeding data for ${modelName}:`, error);
    }
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
