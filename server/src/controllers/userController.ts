import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthenticatedRequest } from "../middleware/auth";

const prisma = new PrismaClient();

export const getUsers = async (req: Request, res: Response): Promise<void> => {
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

export const getUser = async (req: Request, res: Response): Promise<void> => {
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

export const postUser = async (req: Request, res: Response): Promise<void> => {
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

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  const { cognitoId } = req.params;
  const { username, teamId } = req.body;
  try {
    const updatedUser = await prisma.user.update({
      where: { cognitoId },
      data: { username, teamId },
      include: { Team: true },
    });
    res.json(updatedUser);
  } catch (error: any) {
    res.status(500).json({ message: `Error updating user: ${error.message}` });
  }
};
