"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const roleDataTransporter_1 = __importDefault(require("./roleDataTransporter"));
const config_1 = __importDefault(require("../config"));
const fs_1 = require("fs");
class ProfileAnalyst extends roleDataTransporter_1.default {
    constructor() {
        super();
        this.analyzeProfileProcessList = new Map();
    }
    analyzeProfile(params) {
        var _a, _b;
        if (!params.clientId) {
            throw new Error("clientId is required");
        }
        if (!params.userId) {
            throw new Error("userId is required");
        }
        if (this.analyzeProfileProcessList.has(params.clientId)) {
            throw new Error("clientId already exists");
        }
        const fileStoragePath = path_1.default.join(config_1.default === null || config_1.default === void 0 ? void 0 : config_1.default.file_storage_path, params.userId);
        const pythonScriptPath = (_b = (_a = config_1.default === null || config_1.default === void 0 ? void 0 : config_1.default.python_script) === null || _a === void 0 ? void 0 : _a.linkedin_profile_scraper) === null || _b === void 0 ? void 0 : _b.path;
        const childProcess = (0, child_process_1.spawn)("python", [pythonScriptPath, fileStoragePath]);
        this.analyzeProfileProcessList.set(params.clientId, childProcess);
        try {
            const filePath = path_1.default.join(fileStoragePath, "json_cache.json");
            if (!(0, fs_1.existsSync)(filePath)) {
                throw new Error("File not found");
            }
            (0, fs_1.watchFile)(filePath, () => {
                const isProcessRunning = this.isProcessRunning(params.clientId);
                if (!isProcessRunning)
                    return;
                const data = this.getProfileData({ clientId: params.clientId, userId: params.userId });
                if (!data || data.length === 0)
                    return;
                this.data({ clientId: params.clientId, data });
            });
        }
        catch (error) {
            this.error({ clientId: params.clientId, error: error });
        }
        childProcess.stderr.on("data", (data) => {
            this.error({ clientId: params.clientId, error: data.toString() });
        });
        childProcess.on("close", (code, signal) => {
            this.close({ clientId: params.clientId, code, signal });
            const data = this.getProfileData({ clientId: params.clientId, userId: params.userId });
            if (!data || data.length === 0)
                return;
            this.data({ clientId: params.clientId, data });
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
        return !childProcess.killed;
    }
    getProfileData(params) {
        try {
            const fileStoragePath = path_1.default.join(config_1.default === null || config_1.default === void 0 ? void 0 : config_1.default.file_storage_path, params.userId);
            const data = (0, fs_1.readFileSync)(path_1.default.join(fileStoragePath, "json_cache.json"), "utf8");
            const jsonData = JSON.parse(data);
            const dataList = Object.values(jsonData).reduce((acc, curr) => {
                const { profile_data } = curr.response;
                if (!profile_data)
                    return acc;
                return acc.concat([profile_data]);
            }, []);
            return dataList;
        }
        catch (error) {
            console.log("error", error);
        }
    }
}
exports.default = ProfileAnalyst;
