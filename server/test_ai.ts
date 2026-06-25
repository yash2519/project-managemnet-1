import { generateTaskBreakdown } from "./src/controllers/aiController";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();

async function runTest() {
  console.log("Starting AI Assistant test...");
  
  // Find a valid project ID
  const prisma = new PrismaClient();
  const project = await prisma.project.findFirst();
  
  const projectId = project ? project.id : 1;
  console.log(`Using Project ID: ${projectId}`);

  const req = {
    body: {
      title: "Implement Login Page",
      description: "Create a user login page using React and Tailwind CSS.",
      projectId: projectId,
    }
  } as any;

  const res = {
    status: (code: number) => {
      console.log(`Response Status: ${code}`);
      return {
        json: (data: any) => {
          console.log("Response JSON:", JSON.stringify(data, null, 2));
        }
      };
    }
  } as any;

  try {
    await generateTaskBreakdown(req, res);
  } catch (error) {
    console.error("Test execution failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
