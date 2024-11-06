import express from "express";
import user from "./user/index";
import path from "path";
import rolesRouter from "./lead-roles";
import fileManager from "./file-manager";
import { EMAIL_MANAGER_ROUTER } from "./email-manager";
import authRouter from "./auth";

export default async (app: express.Application) => {
  app.use("/doc", express.static(path.join(__dirname, "../../public")));
  app.use("/role", rolesRouter);
  app.use("/user", user);
  app.use("/file", fileManager);
  app.use("/mail-manager", EMAIL_MANAGER_ROUTER);
  app.use("/auth", authRouter);
};

export { user };
