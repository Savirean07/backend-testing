"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const logger_1 = require("../../logger");
const crypto_1 = require("crypto");
const auth_1 = require("../../auth");
const lead_generator_1 = require("../../lead-generator");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const emailGenerator = new lead_generator_1.EmailGenerator();
const rolesRouter = (0, express_1.Router)();
rolesRouter
    .get("/email/:prompt", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sessionId = (0, crypto_1.randomUUID)({ disableEntropyCache: true });
    res.send({ sessionId });
}))
    .post("/emit/user-input", (req, res) => {
    const { content } = req.body;
    const buffer = content && content.length > 0
        ? Buffer.from([...Buffer.from(content), 0x0d, 0x0a])
        : Buffer.from([0x0d, 0x0a]);
    logger_1.logger.message(`user-input ${req.ip}`, buffer.toString());
    res.send(`response from server ${buffer.toString()}`);
})
    .get("/scrape", auth_1.authMiddleware, (req, res) => {
    try {
        const userData = req.userData;
        const userId = userData === null || userData === void 0 ? void 0 : userData.oid;
        if (!userId)
            return res.status(400).json({ message: "User id is required" });
        const { client_session_id } = req.query;
        if (!client_session_id)
            return res.status(400).json({ message: "Session id is required" });
        const sessionId = "url_scraper_".concat(userId, client_session_id);
        const result = emailGenerator.scraperEmailLinkedinAndVerifier({ sessionId, userId });
        if (result instanceof Error)
            return res.status(500).json({ message: result.message });
        res.send(result);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
})
    .get("/scrape-ping", auth_1.authMiddleware, (req, res) => {
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
        const files = (0, fs_1.readdirSync)(path_1.default.join(__dirname, "../../assets/", userId)).filter((file) => file.endsWith(".csv")).map((file) => ({ id: (0, crypto_1.randomUUID)({ disableEntropyCache: true }), name: file }));
        res.status(200).json({ files });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});
exports.default = rolesRouter;
