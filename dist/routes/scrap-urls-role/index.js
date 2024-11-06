"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../../auth");
const lead_generator_1 = require("../../lead-generator");
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const urlScraper = express_1.default.Router();
const emailGenerator = new lead_generator_1.EmailGenerator();
urlScraper.get("/", auth_1.authMiddleware, (req, res) => {
    try {
        const userData = req.userData;
        const userId = userData === null || userData === void 0 ? void 0 : userData.oid;
        if (!userId)
            return res.status(400).json({ message: "User id is required" });
        const { client_session_id } = req.query;
        if (!client_session_id)
            return res.status(400).json({ message: "Session id is required" });
        const sessionId = "url_scraper_".concat(userId, client_session_id);
        const result = emailGenerator.getScrapeTeamOutreachProcess(sessionId);
        if (result instanceof Error)
            return res.status(500).json({ message: result.message });
        if (result)
            return res.status(200).json({ message: "Scrape team outreach process is running" });
        const files = (0, fs_1.readdirSync)(path_1.default.join(__dirname, "../../assets/", userId)).filter((file) => file.endsWith(".csv"));
        res.status(200).json({ files });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.default = urlScraper;
