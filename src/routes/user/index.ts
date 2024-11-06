import { Router } from "express";

const homeRouter = Router();

homeRouter.get("/", (req, res) => {
  res.send("Hello World");
});

export default homeRouter;