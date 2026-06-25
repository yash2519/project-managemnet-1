import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// Create a new team — creator is auto-added as a member
// Body: { teamName, teamLeadUserId?, memberUserIds?: number[] }
// ─────────────────────────────────────────────────────────────────────────────
export const createTeam = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthenticated" });
    return;
  }
  const { teamName, teamLeadUserId, memberUserIds = [] } = req.body;

  if (!teamName?.trim()) {
    res.status(400).json({ message: "Team name is required" });
    return;
  }

  try {
    // Ensure creator is always included
    const allMemberIds: number[] = Array.from(
      new Set([req.user.userId, ...memberUserIds.map(Number)])
    );

    const team = await prisma.team.create({
      data: {
        teamName: teamName.trim(),
        teamLeadUserId: teamLeadUserId ? Number(teamLeadUserId) : null,
      },
    });

    // Bulk-insert UserTeam records
    await prisma.userTeam.createMany({
      data: allMemberIds.map((uid) => ({
        userId: uid,
        teamId: team.id,
        role: uid === req.user!.userId ? "ADMIN" : "MEMBER",
      })),
      skipDuplicates: true,
    });

    res.status(201).json(team);
  } catch (error: any) {
    res.status(500).json({ message: `Error creating team: ${error.message}` });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Get all teams — returns id, teamName, teamLeadUserId and member count
// ─────────────────────────────────────────────────────────────────────────────
export const getTeams = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthenticated" });
    return;
  }
  try {
    const teams = await prisma.team.findMany({
      include: {
        members: { include: { user: true } },
        projects: { select: { id: true, name: true } },
      },
      orderBy: { id: "asc" },
    });

    const result = teams.map((t) => {
      const adminMember = t.members.find((m) => m.role === "ADMIN");
      return {
        id: t.id,
        teamName: t.teamName,
        teamLeadUserId: t.teamLeadUserId,
        adminUsername: adminMember?.user?.username,
        memberCount: t.members.length,
        members: t.members.map((m) => ({
          userId: m.user.userId,
          username: m.user.username,
          profilePictureUrl: m.user.profilePictureUrl,
          roleName: m.user.roleName,
          role: m.role,
        })),
        projects: t.projects,
      };
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: `Error retrieving teams: ${error.message}` });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Get a single team by ID — full detail with members + projects
// ─────────────────────────────────────────────────────────────────────────────
export const getTeamById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthenticated" });
    return;
  }
  const { teamId } = req.params;
  try {
    const team = await prisma.team.findUnique({
      where: { id: Number(teamId) },
      include: {
        members: {
          include: {
            user: {
              select: {
                userId: true,
                username: true,
                profilePictureUrl: true,
                roleName: true,
                role: true,
              },
            },
          },
        },
        projects: {
          select: { id: true, name: true, description: true, startDate: true, endDate: true },
        },
      },
    });

    if (!team) {
      res.status(404).json({ message: "Team not found" });
      return;
    }

    const adminMember = team.members.find((m) => m.role === "ADMIN");

    const response = {
      id: team.id,
      teamName: team.teamName,
      teamLeadUserId: team.teamLeadUserId,
      adminUsername: adminMember?.user?.username,
      memberCount: team.members.length,
      members: team.members.map((m) => ({
        userId: m.user.userId,
        username: m.user.username,
        profilePictureUrl: m.user.profilePictureUrl,
        roleName: m.user.roleName,
        role: m.role,
      })),
      projects: team.projects,
    };

    res.json(response);
  } catch (error: any) {
    res.status(500).json({ message: `Error fetching team: ${error.message}` });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Update a team — name, teamLeadUserId, and/or member list
// Body: { teamName?, teamLeadUserId?, memberUserIds?: number[] }
// ─────────────────────────────────────────────────────────────────────────────
export const updateTeam = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthenticated" });
    return;
  }
  const { teamId } = req.params;
  const { teamName, teamLeadUserId, memberUserIds } = req.body;

  try {
    const isAdmin = await prisma.userTeam.findFirst({
      where: { teamId: Number(teamId), userId: req.user.userId, role: "ADMIN" }
    });
    if (!isAdmin) {
      res.status(403).json({ message: "Only the Team Admin can perform this action" });
      return;
    }

    const team = await prisma.team.findUnique({ where: { id: Number(teamId) } });
    if (!team) {
      res.status(404).json({ message: "Team not found" });
      return;
    }

    // Update scalar fields
    const updated = await prisma.team.update({
      where: { id: Number(teamId) },
      data: {
        teamName: teamName?.trim() ?? team.teamName,
        teamLeadUserId: teamLeadUserId !== undefined ? Number(teamLeadUserId) : team.teamLeadUserId,
      },
    });

    // Replace member list if provided
    if (Array.isArray(memberUserIds)) {
      const allIds: number[] = Array.from(
        new Set([
          ...(teamLeadUserId ? [Number(teamLeadUserId)] : []),
          ...memberUserIds.map(Number),
        ])
      );

      await prisma.userTeam.deleteMany({ where: { teamId: Number(teamId) } });
      await prisma.userTeam.createMany({
        data: allIds.map((uid) => ({
          userId: uid,
          teamId: Number(teamId),
          role: uid === req.user!.userId ? "ADMIN" : "MEMBER",
        })),
        skipDuplicates: true,
      });
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: `Error updating team: ${error.message}` });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Add a member to a team (kept for compatibility)
// ─────────────────────────────────────────────────────────────────────────────
export const addTeamMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthenticated" });
    return;
  }
  const { teamId } = req.params;
  const { userId, role = "MEMBER" } = req.body;
  try {
    const isAdmin = await prisma.userTeam.findFirst({
      where: { teamId: Number(teamId), userId: req.user.userId, role: "ADMIN" }
    });
    if (!isAdmin) {
      res.status(403).json({ message: "Only the Team Admin can perform this action" });
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

// ─────────────────────────────────────────────────────────────────────────────
// List members of a team
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Remove a member from a team
// ─────────────────────────────────────────────────────────────────────────────
export const removeTeamMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthenticated" });
    return;
  }
  const { teamId, userId } = req.params;
  try {
    const isAdmin = await prisma.userTeam.findFirst({
      where: { teamId: Number(teamId), userId: req.user.userId, role: "ADMIN" }
    });
    if (!isAdmin) {
      res.status(403).json({ message: "Only the Team Admin can perform this action" });
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
