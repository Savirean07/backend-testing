import path from "path";
import { ChildProcessWithoutNullStreams, spawn } from "child_process"

import RoleDataTransporter from "./roleDataTransporter";
import config from "../config";
import { existsSync, readFileSync, watchFile } from "fs";

interface IProfileAnalyst {
    analyzeProfile({ clientId, userId }: { clientId: string, userId: string }): void
}

class ProfileAnalyst extends RoleDataTransporter implements IProfileAnalyst {

    private analyzeProfileProcessList: Map<string, ChildProcessWithoutNullStreams>
    constructor() {
        super();
        this.analyzeProfileProcessList = new Map()
    }

    analyzeProfile(params: { clientId: string, userId: string }): boolean {
        if (!params.clientId) {
            throw new Error("clientId is required")
        }
        if (!params.userId) {
            throw new Error("userId is required")
        }
        if (this.analyzeProfileProcessList.has(params.clientId)) {
            throw new Error("clientId already exists")
        }

        const fileStoragePath = path.join(config?.file_storage_path as string, params.userId)
        const pythonScriptPath = config?.python_script?.linkedin_profile_scraper?.path as string
        const childProcess = spawn("python", [pythonScriptPath, fileStoragePath]);

        this.analyzeProfileProcessList.set(params.clientId, childProcess)

        try {
            const filePath = path.join(fileStoragePath, "json_cache.json")
            if (!existsSync(filePath)) {
                throw new Error("File not found")
            }
            watchFile(filePath, () => {
                const isProcessRunning = this.isProcessRunning(params.clientId)
                if (!isProcessRunning) return
                const data = this.getProfileData({ clientId: params.clientId, userId: params.userId })
                if (!data || data.length === 0) return
                this.data({ clientId: params.clientId, data })
            })
        } catch (error) {
            this.error({ clientId: params.clientId, error: error as Error });
        }
        childProcess.stderr.on("data", (data) => {
            this.error({ clientId: params.clientId, error: data.toString() });
        });
        childProcess.on("close", (code, signal) => {
            this.close({ clientId: params.clientId, code, signal });
            const data = this.getProfileData({ clientId: params.clientId, userId: params.userId })
            if (!data || data.length === 0) return
            this.data({ clientId: params.clientId, data })
        });
        childProcess.on("exit", (code, signal) => {
            this.exit({ clientId: params.clientId, status: code, signal });
        });
        childProcess.on("message", (message) => {
            this.message({ clientId: params.clientId, message: message.toString() });
        });
        childProcess.on("error", (error) => {
            this.error({ clientId: params.clientId, error: error });
        });
        childProcess.on("info", (message) => {
            this.info({ clientId: params.clientId, message: message.toString() });
        });
        childProcess.on("debug", (message) => {
            this.debug({ clientId: params.clientId, message: message.toString() });
        });



        return !childProcess.killed
    }

    getProfileData(params: { clientId: string, userId: string }) {
        try {
            const fileStoragePath = path.join(config?.file_storage_path as string, params.userId)
            const data = readFileSync(path.join(fileStoragePath, "json_cache.json"), "utf8")
            const jsonData = JSON.parse(data) as { [key: string]: { response: { profile_data: { summary: string, firstName: string, lastName: string, headline: string } | null } } }
            const dataList = Object.values(jsonData).reduce((acc, curr) => {
                const { profile_data } = curr.response;
                if (!profile_data) return acc
                return acc.concat([profile_data])
            }, [] as { summary: string, firstName: string, lastName: string, headline: string }[])
            return dataList
        } catch (error) {
            console.log("error", error)
        }
    }
}

export default ProfileAnalyst;