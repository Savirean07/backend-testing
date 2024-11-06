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
const axios_1 = __importDefault(require("axios"));
const stream_1 = require("stream");
class RoleDataTransporter extends stream_1.EventEmitter {
    constructor() {
        super();
        this.childProcessList = new Map();
    }
    emit(eventName, ...args) {
        return super.emit(eventName, ...args);
    }
    on(event, listener) {
        super.on(event, listener);
        return this;
    }
    close({ clientId, code, signal }) {
        this.emit("close", { clientId, code, signal });
        this.childProcessList.delete(clientId);
    }
    exit({ clientId, status, signal }) {
        this.emit("exit", { clientId, status, signal });
    }
    error({ clientId, error }) {
        this.emit("error", { clientId, error });
    }
    data({ clientId, data }) {
        this.emit("data", { clientId, data });
    }
    message({ clientId, message }) {
        this.emit("message", { clientId, message });
    }
    info({ clientId, message }) {
        this.emit("info", { clientId, message });
    }
    debug({ clientId, message }) {
        this.emit("debug", { clientId, message });
    }
    abort(clientId, signal) {
        if (!this.childProcessList.has(clientId)) {
            throw new Error("Client ID not found");
        }
        const childProcess = this.childProcessList.get(clientId);
        if (!childProcess) {
            throw new Error("No process found");
        }
        const isKilled = childProcess.kill(signal);
        if (isKilled) {
            this.childProcessList.delete(clientId);
        }
        return isKilled;
    }
    input(clientId, data) {
        if (!this.childProcessList.has(clientId)) {
            throw new Error("Client ID not found");
        }
        const childProcess = this.childProcessList.get(clientId);
        if (!childProcess) {
            throw new Error("No process found");
        }
        childProcess.stdin.write(data);
    }
    isProcessRunning(clientId) {
        if (!this.childProcessList.has(clientId)) {
            throw new Error("Client ID not found");
        }
        const childProcess = this.childProcessList.get(clientId);
        if (!childProcess) {
            throw new Error("No process found");
        }
        return !childProcess.killed;
    }
    convertIntoMarkdown(data) {
        const markdown = data.reduce((acc, curr) => {
            const { markExpression, data } = curr;
            const markDown = markExpression.concat(data);
            return acc.concat("\n\n", markDown);
        }, "");
        return markdown;
    }
    sendEmail(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { recipient, ccRecipient, bccRecipient, subject, body, authToken } = params;
            try {
                const payload = {
                    message: {
                        body: {
                            contentType: "text",
                            content: body
                        },
                        subject: subject,
                        toRecipients: recipient.map((email) => ({ emailAddress: { address: email } })),
                        ccRecipients: ccRecipient ? ccRecipient.map((email) => ({ emailAddress: { address: email } })) : [],
                        bccRecipients: bccRecipient ? bccRecipient.map((email) => ({ emailAddress: { address: email } })) : []
                    }
                };
                const response = yield axios_1.default.post("https://graph.microsoft.com/v1.0/me/sendMail", payload, {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${authToken}`
                    }
                });
                return {
                    status: response.status,
                    statusText: response.statusText,
                    data: response.data
                };
            }
            catch (error) {
                throw error;
            }
        });
    }
}
exports.default = RoleDataTransporter;
