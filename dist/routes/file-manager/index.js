"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const auth_1 = require("../../auth");
const config_1 = __importDefault(require("../../config"));
const fileManager = (0, express_1.Router)();
fileManager.get("/", auth_1.authMiddleware, (req, res, next) => {
    const fileName = req.query.fileName;
    const user = req.userData;
    const userId = user === null || user === void 0 ? void 0 : user.oid;
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const filePath = path_1.default.join(config_1.default.file_storage_path, userId, fileName);
    if (!fs_1.default.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
    }
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    res.sendFile(filePath);
})
    .get("/all", auth_1.authMiddleware, (req, res, next) => {
    try {
        const user = req.userData;
        const userId = user === null || user === void 0 ? void 0 : user.oid;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const filePath = path_1.default.join(config_1.default.file_storage_path, userId);
        const isPathExists = fs_1.default.existsSync(filePath);
        if (!isPathExists) {
            fs_1.default.mkdirSync(filePath, { recursive: true });
            return res.json([]);
        }
        const fileMetadata = fs_1.default.readdirSync(filePath);
        const fileDetails = fileMetadata.filter(file => fs_1.default.statSync(path_1.default.join(filePath, file)).isFile());
        res.json(fileDetails);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
})
    .post("/upload", auth_1.authMiddleware, (req, res, next) => {
    const file = req.body.file;
    const user = req.userData;
    const userId = user === null || user === void 0 ? void 0 : user.oid;
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
    }
    const filePath = path_1.default.join(config_1.default.file_storage_path, userId, file.name);
    fs_1.default.writeFileSync(filePath, file.content);
    res.json({ message: "File uploaded successfully" });
});
exports.default = fileManager;
