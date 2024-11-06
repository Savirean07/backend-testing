import { Router, Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { authMiddleware, CustomRequest } from "../../auth";
import config from "../../config";

const fileManager = Router();

fileManager.get("/", authMiddleware, (req: CustomRequest, res: Response, next: NextFunction) => {
    const fileName = req.query.fileName as string;
    const user = req.userData;
    const userId = user?.oid;
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const filePath = path.join(config.file_storage_path as string, userId, fileName);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
    }
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    res.sendFile(filePath);
})
    .get("/all", authMiddleware, (req: CustomRequest, res: Response, next: NextFunction) => {
        try {
            const user = req.userData;
            const userId = user?.oid;
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const filePath = path.join(config.file_storage_path as string, userId)
            const isPathExists = fs.existsSync(filePath)
            if (!isPathExists) {
                fs.mkdirSync(filePath, { recursive: true })
                return res.json([])
            }
            const fileMetadata = fs.readdirSync(filePath);
            const fileDetails = fileMetadata.filter(file => fs.statSync(path.join(filePath, file)).isFile());
            res.json(fileDetails)
        } catch (error) {
            console.log(error)
            res.status(500).json({ message: "Internal server error" });
        }
    })
    .post("/upload", authMiddleware, (req: CustomRequest, res: Response, next: NextFunction) => {
        const file = req.body.file;
        const user = req.userData;
        const userId = user?.oid;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (!file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        const filePath = path.join(config.file_storage_path as string, userId, file.name);
        fs.writeFileSync(filePath, file.content);
        res.json({ message: "File uploaded successfully" });
    })

export default fileManager;