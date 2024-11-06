import express, { Response } from "express"
import { authMiddleware, CustomRequest } from "../../auth"
import { EmailGenerator } from "../../lead-generator"
import path from "path"
import { readdirSync } from "fs"

const urlScraper = express.Router()
const emailGenerator = new EmailGenerator()

urlScraper.get("/", authMiddleware, (req: CustomRequest, res: Response) => {
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
        const files = readdirSync(path.join(__dirname, "../../assets/", userId)).filter((file) => file.endsWith(".csv"))
        res.status(200).json({ files })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Internal server error" })
    }
})

export default urlScraper