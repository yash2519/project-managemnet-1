import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Create a new team; creator becomes ADMIN of the team
export const createTeam = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthenticated" });
    return;
  }
  const { teamName, scopeOfWork, productOwnerUserId } = req.body;
  try {
    const team = await prisma.team.create({
      data: { 
        teamName, 
        scopeOfWork, 
        productOwnerUserId: productOwnerUserId ? Number(productOwnerUserId) : undefined 
      },
    });
    // Add creator as ADMIN
    await prisma.userTeam.create({
      data: { userId: req.user.userId, teamId: team.id, role: "ADMIN" },
    });
    res.status(201).json(team);
  } catch (error: any) {
    res.status(500).json({ message: `Error creating team: ${error.message}` });
  }
};

// Get all teams (visible to all authenticated users)
export const getTeams = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthenticated" });
    return;
  }
  try {
    const teams = await prisma.team.findMany({
      include: { members: { include: { user: true } } },
    });
    res.json(teams);
  } catch (error: any) {
    res.status(500).json({ message: `Error retrieving teams: ${error.message}` });
  }
};

// Add a member to a team (in‑app search & add)
export const addTeamMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthenticated" });
    return;
  }
  const { teamId } = req.params;
  const { userId, role = "MEMBER" } = req.body;
  try {
    const requesterMembership = await prisma.userTeam.findFirst({
      where: { userId: req.user.userId, teamId: Number(teamId) },
    });
    const canAdd = req.user.role === "ADMIN" || (requesterMembership && ["ADMIN", "MANAGER"].includes(requesterMembership.role));
    if (!canAdd) {
      res.status(403).json({ message: "Forbidden: insufficient permissions to add members" });
      return;
    }
    const existing = await prisma.userTeam.findFirst({
      where: { userId: Number(userId), teamId: Number(teamId) },
    });
    if (existing) {
      res.status(400).json({ message: "User already a member of this team" });
      return;
    }
    await prisma.userTeam.create({
      data: { userId: Number(userId), teamId: Number(teamId), role },
    });
    res.status(201).json({ message: "Member added" });
  } catch (error: any) {
    res.status(500).json({ message: `Error adding member: ${error.message}` });
  }
};

// List members of a team
export const getTeamMembers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthenticated" });
    return;
  }
  const { teamId } = req.params;
  try {
    const members = await prisma.userTeam.findMany({
      where: { teamId: Number(teamId) },
      include: { user: true },
    });
    res.json(members);
  } catch (error: any) {
    res.status(500).json({ message: `Error fetching team members: ${error.message}` });
  }
};

// Remove a member from a team
export const removeTeamMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthenticated" });
    return;
  }
  const { teamId, userId } = req.params;
  try {
    const requesterMembership = await prisma.userTeam.findFirst({
      where: { userId: req.user.userId, teamId: Number(teamId) },
    });
    const canRemove = req.user.role === "ADMIN" || (requesterMembership && ["ADMIN", "MANAGER"].includes(requesterMembership.role));
    if (!canRemove) {
      res.status(403).json({ message: "Forbidden: insufficient permissions to remove members" });
      return;
    }
    await prisma.userTeam.deleteMany({
      where: { userId: Number(userId), teamId: Number(teamId) },
    });
    res.json({ message: "Member removed" });
  } catch (error: any) {
    res.status(500).json({ message: `Error removing member: ${error.message}` });
  }
};
