const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.taskDependency.findMany().then(console.log).catch(console.error).finally(()=>p.$disconnect());
