import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthenticatedRequest } from "../middleware/auth";

const prisma = new PrismaClient();

export const getUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthenticated" });
    return;
  }
  try {
    const users = await prisma.user.findMany({
      select: {
        userId: true,
        username: true,
        profilePictureUrl: true,
        role: true,
      }
    });
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: `Error retrieving users: ${error.message}` });
  }
};

export const getUserMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthenticated" });
    return;
  }
  try {
    const user = await prisma.user.findUnique({
      where: { userId: req.user.userId },
      include: {
        teams: { include: { team: true } },
      },
    });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: `Error retrieving user info: ${error.message}` });
  }
};

export const getUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { cognitoId } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { cognitoId },
      include: { Team: true },
    });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: `Error retrieving user: ${error.message}` });
  }
};

export const postUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { username, cognitoId, profilePictureUrl = "i1.jpg", teamId } = req.body;
    const newUser = await prisma.user.create({
      data: { username, cognitoId, profilePictureUrl, teamId },
    });
    res.json({ message: "User Created Successfully", newUser });
  } catch (error: any) {
    res.status(500).json({ message: `Error creating user: ${error.message}` });
  }
};

export const updateUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { cognitoId } = req.params;
  const { username } = req.body;
  let { roleName } = req.body;

  const validateCustomField = (value: string | undefined): string | undefined => {
    if (!value) return value;
    const trimmed = value.trim();
    if (!trimmed) throw new Error("Role cannot be empty.");
    const regex = /^[a-zA-Z\s]+$/;
    if (!regex.test(trimmed)) {
      throw new Error("Only alphabetic characters and spaces are allowed.");
    }
    return trimmed;
  };

  try {
    roleName = validateCustomField(roleName);

    const updatedUser = await prisma.user.update({
      where: { cognitoId },
      data: { username, roleName },
      include: { teams: true },
    });
    res.json(updatedUser);
  } catch (error: any) {
    if (error.message === "Only alphabetic characters and spaces are allowed." || error.message === "Role cannot be empty.") {
      res.status(400).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: `Error updating user: ${error.message}` });
  }
};

// ---------------------------------------------------------------------------
// PATCH /users/me/profile-picture
// Called after a PROFILE_PICTURE upload is confirmed via POST /uploads/confirm
// ---------------------------------------------------------------------------

export const updateProfilePicture = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthenticated" });
    return;
  }

  const { s3Key } = req.body;

  if (!s3Key) {
    res.status(400).json({ message: "s3Key is required" });
    return;
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { userId: req.user.userId },
      data: { profilePictureUrl: s3Key },
    });
    res.json(updatedUser);
  } catch (error: any) {
    res.status(500).json({ message: `Error updating profile picture: ${error.message}` });
  }
};
