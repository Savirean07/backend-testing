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
const auth_1 = require("../../auth");
const roleDataTransporter_1 = __importDefault(require("../../lead-generator/roleDataTransporter"));
const EMAIL_MANAGER_ROUTER = (0, express_1.Router)();
EMAIL_MANAGER_ROUTER.post("/send", auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { recipient, ccRecipient, bccRecipient, subject, body, from } = req.body;
        if (!recipient || recipient.length === 0) {
            return res.status(400).json({ message: "At least one recipient is required" });
        }
        if (!subject || !body) {
            return res.status(400).json({ message: "Subject and body are required" });
        }
        if (!from) {
            return res.status(400).json({ message: "From is required" });
        }
        const roleDataTransporter = new roleDataTransporter_1.default();
        const response = yield roleDataTransporter.sendEmail({ recipient, ccRecipient, bccRecipient, subject, body, authToken: from });
        res.status(response.status).json(response);
    }
    catch (error) {
        return res.status(500).json({ message: error.message || "Internal server error" });
    }
}));
exports.default = EMAIL_MANAGER_ROUTER;
