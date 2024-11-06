import { Router } from "express";
import { authMiddleware, CustomRequest } from "../../auth";
import RoleDataTransporter from "../../lead-generator/roleDataTransporter";

const EMAIL_MANAGER_ROUTER = Router()

EMAIL_MANAGER_ROUTER.post("/send", authMiddleware, async (req: CustomRequest, res) => {
    try {
        const { recipient, ccRecipient, bccRecipient, subject, body, from } = req.body as { recipient: string[], ccRecipient: string[], bccRecipient: string[], subject: string, body: string, from: string }

        if (!recipient || recipient.length === 0) {
            return res.status(400).json({ message: "At least one recipient is required" })
        }
        if (!subject || !body) {
            return res.status(400).json({ message: "Subject and body are required" })
        }
        if (!from) {
            return res.status(400).json({ message: "From is required" })
        }
        const roleDataTransporter = new RoleDataTransporter()
        const response = await roleDataTransporter.sendEmail({ recipient, ccRecipient, bccRecipient, subject, body, authToken: from })
        res.status(response.status).json(response)
    } catch (error) {
        return res.status(500).json({ message: (error as Error).message || "Internal server error" })
    }
})

export default EMAIL_MANAGER_ROUTER