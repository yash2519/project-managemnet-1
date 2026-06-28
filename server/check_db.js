const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const projects = await prisma.project.findMany({
    include: {
      team: {
        include: {
          members: {
            include: {
              user: true
            }
          }
        }
      }
    }
  });
  console.log(JSON.stringify(projects, null, 2));
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
