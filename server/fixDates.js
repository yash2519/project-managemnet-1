const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDates() {
  console.log("Fixing inverted project dates...");
  const projects = await prisma.project.findMany();
  for (const p of projects) {
    if (p.startDate && p.endDate && p.startDate > p.endDate) {
      await prisma.project.update({
        where: { id: p.id },
        data: {
          startDate: p.endDate,
          endDate: p.startDate
        }
      });
      console.log(`Swapped dates for Project ID ${p.id}`);
    }
  }

  console.log("Fixing inverted task dates...");
  const tasks = await prisma.task.findMany();
  for (const t of tasks) {
    if (t.startDate && t.dueDate && t.startDate > t.dueDate) {
      await prisma.task.update({
        where: { id: t.id },
        data: {
          startDate: t.dueDate,
          dueDate: t.startDate
        }
      });
      console.log(`Swapped dates for Task ID ${t.id}`);
    }
  }

  console.log("All inverted dates have been fixed!");
}

fixDates()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
