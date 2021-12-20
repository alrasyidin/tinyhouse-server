import { Request } from "express";
import { Database, User } from "../types";

export const authorize = async (
  db: Database,
  req: Request
): Promise<User | null> => {
  const token = req.get("X-CSRF-TOKEN");
  const viewer = await db.users.findOne({
    _id: req.session.viewer,
    token,
  });

  return viewer;
};

export const capitalize = (text: string): string => {
  return text
    .split(" ")
    .map((word) => word[0].toUpperCase() + word.substr(1).toLowerCase())
    .join(" ");
};
