import { AuthProviderCallback, Client } from "@microsoft/microsoft-graph-client";
import axios from "axios";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { EventEmitter } from "stream";

interface IRoleDataTransporter {
    abort(clientId: string, signal: NodeJS.Signals): void
    input(clientId: string, data: string): void
    isProcessRunning(clientId: string): boolean
}

class RoleDataTransporter extends EventEmitter implements IRoleDataTransporter {
    private childProcessList: Map<string, ChildProcessWithoutNullStreams>;

    constructor() {
        super();
        this.childProcessList = new Map()
    }

    emit(eventName: "error", data: { clientId: string, error: Error | { message: string } }): boolean;
    emit(eventName: "data", data: { clientId: string, data: any }): boolean;
    emit(eventName: "close", data: { clientId: string, code: number | null, signal: NodeJS.Signals | null }): boolean;
    emit(eventName: "exit", data: { clientId: string, status: number | null, signal: NodeJS.Signals | null }): boolean;
    emit(eventName: "message", data: { clientId: string, message: string }): boolean;
    emit(eventName: "info", data: { clientId: string, message: string }): boolean;
    emit(eventName: "debug", data: { clientId: string, message: string }): boolean;
    emit(eventName: string | symbol, ...args: any[]): boolean {
        return super.emit(eventName, ...args);
    }

    on(event: "error", listener: (data: { clientId: string, error: Error | { message: string } }) => void): this;
    on(event: "data", listener: (data: { clientId: string, data: any }) => void): this;
    on(event: "close", listener: (data: { clientId: string, code: number | null, signal: NodeJS.Signals | null }) => void): this;
    on(event: "exit", listener: (data: { clientId: string, status: number | null, signal: NodeJS.Signals | null }) => void): this;
    on(event: "message", listener: (data: { clientId: string, message: string }) => void): this;
    on(event: "info", listener: (data: { clientId: string, message: string }) => void): this;
    on(event: "debug", listener: (data: { clientId: string, message: string }) => void): this;
    on(event: string, listener: (...args: any[]) => void): this {
        super.on(event, listener);
        return this;
    }

    protected close({ clientId, code, signal }: { clientId: string, code: number | null, signal: NodeJS.Signals | null }) {
        this.emit("close", { clientId, code, signal });
        this.childProcessList.delete(clientId)
    }

    protected exit({ clientId, status, signal }: { clientId: string, status: number | null, signal: NodeJS.Signals | null }) {
        this.emit("exit", { clientId, status, signal });
    }

    protected error({ clientId, error }: { clientId: string, error: Error | { message: string } }) {
        this.emit("error", { clientId, error });
    }

    protected data({ clientId, data }: { clientId: string, data: any }) {
        this.emit("data", { clientId, data });
    }

    protected message({ clientId, message }: { clientId: string, message: string }) {
        this.emit("message", { clientId, message });
    }

    protected info({ clientId, message }: { clientId: string, message: string }) {
        this.emit("info", { clientId, message });
    }

    protected debug({ clientId, message }: { clientId: string, message: string }) {
        this.emit("debug", { clientId, message });
    }

    abort(clientId: string, signal: NodeJS.Signals) {
        if (!this.childProcessList.has(clientId)) {
            throw new Error("Client ID not found")
        }
        const childProcess = this.childProcessList.get(clientId)
        if (!childProcess) {
            throw new Error("No process found")
        }
        const isKilled = childProcess.kill(signal)
        if (isKilled) {
            this.childProcessList.delete(clientId)
        }
        return isKilled
    }

    input(clientId: string, data: string) {
        if (!this.childProcessList.has(clientId)) {
            throw new Error("Client ID not found")
        }
        const childProcess = this.childProcessList.get(clientId)
        if (!childProcess) {
            throw new Error("No process found")
        }
        childProcess.stdin.write(data)
    }

    isProcessRunning(clientId: string) {
        if (!this.childProcessList.has(clientId)) {
            throw new Error("Client ID not found")
        }
        const childProcess = this.childProcessList.get(clientId)
        if (!childProcess) {
            throw new Error("No process found")
        }
        return !childProcess.killed
    }

    convertIntoMarkdown(data: { markExpression: string, data: string }[]) {
        const markdown = data.reduce((acc, curr) => {
            const { markExpression, data } = curr
            const markDown = markExpression.concat(data)
            return acc.concat("\n\n", markDown)
        }, "")
        return markdown
    }

    async sendEmail(params: { recipient: string[], ccRecipient?: string[], bccRecipient?: string[], subject: string, body: string, authToken: string }) {
        const { recipient, ccRecipient, bccRecipient, subject, body, authToken } = params
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
            }
            const response = await axios.post("https://graph.microsoft.com/v1.0/me/sendMail", payload, {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${authToken}`
                }
            })
            return {
                status: response.status,
                statusText: response.statusText,
                data: response.data
            }
        } catch (error: any) {
            throw error
        }
    }
}

export default RoleDataTransporter;