import { Response, Router } from "express";
import { logger } from "../../logger";
import { randomUUID } from "crypto";
import { authMiddleware, CustomRequest } from "../../auth"
import { EmailGenerator } from "../../lead-generator"
import { readdirSync } from "fs";
import path from "path";
const emailGenerator = new EmailGenerator()
const rolesRouter = Router();

rolesRouter
  .get("/email/:prompt", async (req, res) => {
    const sessionId = randomUUID({ disableEntropyCache: true });
    res.send({ sessionId });
  })
  .post("/emit/user-input", (req, res) => {
    const { content } = req.body as { content: string };

    const buffer =
      content && content.length > 0
        ? Buffer.from([...Buffer.from(content), 0x0d, 0x0a])
        : Buffer.from([0x0d, 0x0a]);
    logger.message(`user-input ${req.ip}`, buffer.toString());
    res.send(`response from server ${buffer.toString()}`);
  })
  .get("/scrape", authMiddleware, (req: CustomRequest, res: Response) => {
    try {
      const userData = req.userData
      const userId = userData?.oid
      if (!userId) return res.status(400).json({ message: "User id is required" })
      const { client_session_id } = req.query
      if (!client_session_id) return res.status(400).json({ message: "Session id is required" })
      const sessionId = "url_scraper_".concat(userId, client_session_id as string)
      const result = emailGenerator.scraperEmailLinkedinAndVerifier({ sessionId, userId })
      if (result instanceof Error) return res.status(500).json({ message: result.message })
      res.send(result)
    } catch (error: any) {
      console.log(error)
      res.status(500).json({ message: "Internal server error", error: error.message })
    }
  })
  .get("/scrape-ping", authMiddleware, (req: CustomRequest, res: Response) => {
    try {
      const userData = req.userData
      const userId = userData?.oid
      if (!userId) return res.status(400).json({ message: "User id is required" })
      const { client_session_id } = req.query
      if (!client_session_id) return res.status(400).json({ message: "Session id is required" })
      const sessionId = "url_scraper_".concat(userId, client_session_id as string)
      const result = emailGenerator.getScrapeTeamOutreachProcess(sessionId)
      if (result instanceof Error) return res.status(500).json({ message: result.message })
      if (result) return res.status(200).json({ message: "Scrape team outreach process is running" })
      const files = readdirSync(path.join(__dirname, "../../assets/", userId)).filter((file) => file.endsWith(".csv")).map((file) => ({ id: randomUUID({ disableEntropyCache: true }), name: file }))
      res.status(200).json({ files })
    } catch (error: any) {
      console.log(error)
      res.status(500).json({ message: "Internal server error", error: error.message })
    }
  })

export default rolesRouter;
