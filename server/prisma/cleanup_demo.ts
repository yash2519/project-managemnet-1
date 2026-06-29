import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting safe database cleanup for demonstration...");

  try {
    // We use an interactive transaction to ensure all-or-nothing execution
    await prisma.$transaction(async (tx) => {
      console.log("1. Unlinking Users from Teams to preserve User profiles...");
      // By unlinking first, we safely preserve all User records and their Cognito linkage
      await tx.user.updateMany({
        data: {
          teamId: null,
          teamName: null,
        },
      });

      console.log("2. Clearing dependent/child tables (bottom-up order)...");
      
      const taskDependencies = await tx.taskDependency.deleteMany();
      console.log(`  - Cleared ${taskDependencies.count} TaskDependencies`);

      const taskAssignments = await tx.taskAssignment.deleteMany();
      console.log(`  - Cleared ${taskAssignments.count} TaskAssignments`);

      const comments = await tx.comment.deleteMany();
      console.log(`  - Cleared ${comments.count} Comments`);

      const attachments = await tx.attachment.deleteMany();
      console.log(`  - Cleared ${attachments.count} Attachments`);

      const activities = await tx.activity.deleteMany();
      console.log(`  - Cleared ${activities.count} Activities (Audit Logs)`);

      const standupReports = await tx.standupReport.deleteMany();
      console.log(`  - Cleared ${standupReports.count} StandupReports (AI History)`);

      const projectTeams = await tx.projectTeam.deleteMany();
      console.log(`  - Cleared ${projectTeams.count} ProjectTeams`);

      const fileUploads = await tx.fileUpload.deleteMany();
      console.log(`  - Cleared ${fileUploads.count} FileUploads (S3 Metadata)`);

      console.log("3. Clearing parent application data...");
      
      const tasks = await tx.task.deleteMany();
      console.log(`  - Cleared ${tasks.count} Tasks`);

      const projects = await tx.project.deleteMany();
      console.log(`  - Cleared ${projects.count} Projects`);

      const userTeams = await tx.userTeam.deleteMany();
      console.log(`  - Cleared ${userTeams.count} UserTeams (Role Mappings)`);

      const teams = await tx.team.deleteMany();
      console.log(`  - Cleared ${teams.count} Teams`);
    });

    console.log("✅ Cleanup complete! The database is now ready for a fresh demonstration.");
  } catch (error) {
    console.error("❌ Fatal Error during cleanup. The transaction has been rolled back.", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
