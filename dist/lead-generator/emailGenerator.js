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
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const events_1 = require("events");
const fs_1 = require("fs");
const child_process_1 = require("child_process");
const textParser_1 = require("./textParser");
const waitAndConcat_1 = __importDefault(require("../utils/waitAndConcat"));
const tempLocalResponseStorage_1 = __importDefault(require("../utils/tempLocalResponseStorage"));
const config_1 = __importDefault(require("../config"));
const tempLocalResponseStorage = (0, tempLocalResponseStorage_1.default)();
const processStatus = {
    SUCCESS: "success",
    ERROR: "error",
    IN_PROGRESS: "in_progress",
    WAITING: "waiting",
    STOPPED: "stopped",
};
class EmailGenerator extends textParser_1.TransformData {
    constructor() {
        super();
        this.eventEmitter = new events_1.EventEmitter();
        this.responseTempStorage = "";
        this.isThisResponseEnded = true;
        this.counter = 0;
        this.mapChildProcess = new Map();
        this.mapScrapeTeamOutreach = new Map();
        this.mapScrapeLinkedinProfile = new Map();
        this.mapSendEmailThroughOutlook = new Map();
    }
    emit(event, ...args) {
        this.eventEmitter.emit(event, ...args);
    }
    on(event, callback) {
        this.eventEmitter.on(event, callback);
    }
    // Event handler methods
    // Description: This method is used to handle the json data from the python script
    // It is used to transform the data from the python script and emit the data
    // It is used to emit the data to the event emitter
    handleJsonData(sessionId, userId, data) {
        const response = data.toString();
        try {
            (0, waitAndConcat_1.default)(response, {
                sapratorExpression: /-{4,}/,
                excludeConditionExpression: [/TERMINATE/i, /Please give feedback to/i],
                callback: (data) => __awaiter(this, void 0, void 0, function* () {
                    let result = this.transformData(data, this.counter);
                    if (result && sessionId) {
                        result.timestamp = Date.now();
                        result.id = (0, crypto_1.randomUUID)();
                        const refinedData = this.refineData(result);
                        tempLocalResponseStorage.push(sessionId, refinedData, { userId: userId });
                        this.eventEmitter.emit("json_data", { sessionId: sessionId, data: refinedData });
                    }
                })
            });
        }
        catch (error) {
            this.eventEmitter.emit("error", { sessionId: sessionId, message: typeof error === "string" ? error : error === null || error === void 0 ? void 0 : error.message });
        }
        this.counter++;
    }
    refineData(data) {
        if (/^email|^search_parameters/i.test(data.response_type)) {
            return Object.assign(Object.assign({}, data), { content: null });
        }
        return data;
    }
    // Description: This method is used to handle the exit event from the python script
    // It is used to emit the exit event to the event emitter
    handleExit(sessionId, code, signal) {
        if (code === null) {
            const exitMessage = signal ? `Email generation failed with signal: ${signal}` : "Email generation failed";
            this.eventEmitter.emit("exit", { sessionId, exitMessage });
        }
        else {
            const exitMessage = code > 0
                ? "Process is exit with code: " + code
                : "Process Completed";
            this.eventEmitter.emit("exit", { sessionId, exitMessage });
        }
    }
    // Description: This method is used to handle the error event from the python script
    // It is used to emit the error event to the event emitter
    handleError(sessionId, error) {
        if (!sessionId)
            return;
        if (error) {
            const errorMessage = typeof error === "string" ? error : error === null || error === void 0 ? void 0 : error.message;
            this.eventEmitter.emit("error", { sessionId: sessionId, message: errorMessage });
            return;
        }
        this.eventEmitter.emit("error", {
            sessionId: sessionId,
            message: "An unknown error occurred"
        });
    }
    pullData(id) {
        const data = tempLocalResponseStorage.get(id);
        if (!data)
            return new Error("No timeline history found for this session");
        return data;
    }
    // Description: This method is used to handle the close event from the python script
    // It is used to emit the close event to the event emitter
    handleClose(sessionId, code, signal) {
        if (!sessionId)
            return;
        if (code === null) {
            const message = signal
                ? `Email generation failed with signal: ${signal}`
                : "Email generation failed";
            this.eventEmitter.emit("close", { sessionId, message, code: signal });
            return;
        }
        const message = code > 0
            ? "Process is exit with code: " + code
            : "Process Completed";
        this.eventEmitter.emit("close", { sessionId, message, code });
    }
    handleMessage(sessionId, message) {
        this.eventEmitter.emit("message", { sessionId, message });
    }
    // Description: This method is used to generate the email
    // It is used to spawn a new process and communicate with it
    // It is used to emit the data to the event emitter
    generate({ prompt, sessionId, userId }) {
        var _a;
        if (!sessionId)
            return;
        if (this.mapChildProcess.has(sessionId)) {
            this.emit("error", { message: "Email generation already in progress", sessionId: sessionId });
            return;
        }
        const scriptPath = (_a = config_1.default.python_script.outreach) === null || _a === void 0 ? void 0 : _a.path;
        if (!scriptPath)
            return new Error("Python script path not found");
        const storePath = config_1.default.file_storage_path;
        if (!storePath)
            return new Error("File storage path not found");
        const fileStoragePath = this.createDir(path_1.default.join(storePath, userId));
        if (!fileStoragePath)
            return new Error("File storage path not found");
        const verifiedEmailsPath = path_1.default.join(fileStoragePath, "verified_emails.csv");
        const isVerifiedEmailsPathExists = (0, fs_1.existsSync)(verifiedEmailsPath);
        if (!isVerifiedEmailsPathExists)
            return new Error("Verified emails path not found");
        const childProcess = (0, child_process_1.spawn)("python3", [scriptPath, fileStoragePath, verifiedEmailsPath]);
        this.mapChildProcess.set(sessionId, childProcess);
        childProcess.stdout.on("data", (chunk) => {
            this.handleJsonData(sessionId, userId, chunk);
        });
        childProcess.stderr.on("data", (chunk) => {
            this.handleError(sessionId, new Error(chunk.toString()));
        });
        childProcess.on("error", (error) => {
            this.handleError(sessionId, error);
        });
        childProcess.on("close", (code, signal) => {
            this.handleClose(sessionId, code, signal);
        });
        childProcess.on("exit", (code, signal) => {
            this.handleExit(sessionId, code, signal);
        });
        return childProcess.killed;
    }
    // Description: This method is used to scrape the linkedin profile and verify the email
    // It is used to spawn a new process and communicate with it
    // It is used to emit the data to the event emitter
    // It is used to watch the file and emit the file changed event to the event emitter
    scraperEmailLinkedinAndVerifier({ sessionId, userId }) {
        var _a;
        if (!sessionId)
            return new Error("sessionId should be");
        if (!userId)
            return new Error("userId should be");
        const scriptPath = (_a = config_1.default.python_script.url_scraper) === null || _a === void 0 ? void 0 : _a.path;
        if (!scriptPath)
            return new Error("Python script path not found");
        const storePath = config_1.default.file_storage_path;
        if (!storePath)
            return new Error("File storage path not found");
        const fileStoragePath = this.createDir(path_1.default.join(storePath, userId));
        if (!fileStoragePath)
            return new Error("File storage path not found");
        let prevDataSize = 0;
        const csvFileName = "verified_emails.csv";
        const process = this.mapScrapeTeamOutreach.get(sessionId);
        if (process)
            return new Error("Scrape team outreach already in progress");
        const childProcess = (0, child_process_1.spawn)("python", [scriptPath, fileStoragePath]);
        this.mapScrapeTeamOutreach.set(sessionId, childProcess);
        try {
            const fileDataList = (0, fs_1.readFileSync)(fileStoragePath + "/" + csvFileName, "utf8").split("\n");
            prevDataSize = fileDataList.length;
            const moreLeads = prevDataSize > 11 ? `${prevDataSize - 10} more leads\n` : "";
            const fileDataString = "\`\`\`txt\n" + moreLeads + fileDataList.slice(-10).join("\n----------------------\n") + "\n\`\`\`";
            this.eventEmitter.emit("file_changed", { sessionId, fileData: fileDataString, message: "Previous generated leads (and more generation in progress)" });
        }
        catch (error) {
            this.eventEmitter.emit("file_changed", { sessionId, message: "Lead generation is in progress" });
        }
        childProcess.stdout.on("data", (chunk) => {
            this.handleMessage(sessionId, chunk.toString());
        });
        childProcess.stderr.on("data", (chunk) => {
            this.handleError(sessionId, new Error(chunk.toString()));
        });
        childProcess.on("error", (error) => {
            this.handleError(sessionId, error);
        });
        childProcess.on("exit", (code, signal) => {
            this.handleExit(sessionId, code, signal);
        });
        childProcess.on("close", (code, signal) => {
            try {
                this.eventEmitter.emit("file_changed", { sessionId, message: "Leads generation completed" });
                this.handleClose(sessionId, code, signal);
                this.mapScrapeTeamOutreach.delete(sessionId);
            }
            catch (error) {
                this.handleError(sessionId, new Error(typeof error === "string" ? error : error === null || error === void 0 ? void 0 : error.message));
            }
        });
        (0, fs_1.watchFile)(fileStoragePath + "/" + csvFileName, () => {
            try {
                if (childProcess.killed)
                    return;
                const fileData = (0, fs_1.readFileSync)(fileStoragePath + "/" + csvFileName, "utf8").split("\n").filter((item) => item.trim() !== "");
                const lastData = fileData.at(-1);
                if (!lastData)
                    return;
                if (lastData) {
                    const fileDataString = "\`\`\`txt\n" + lastData + "\n\`\`\`";
                    this.eventEmitter.emit("file_changed", { sessionId, fileData: fileDataString, message: "New generated leads (and more generation in progress)" });
                }
            }
            catch (error) {
                this.handleError(sessionId, new Error(typeof error === "string" ? error : "File not found"));
            }
        });
        return childProcess.killed;
    }
    sendEmailThroughOutlook({ sessionId, userId, emailData }) {
        var _a;
        if (!sessionId)
            return new Error("sessionId should be");
        if (!userId)
            return new Error("userId should be");
        if (!emailData)
            return new Error("emailData should be");
        const { subject, body, to, from, cc, bcc } = emailData;
        const outlookScriptPath = ((_a = config_1.default.python_script.outlook) === null || _a === void 0 ? void 0 : _a.path) || "";
        const childProcess = (0, child_process_1.spawn)("python", [outlookScriptPath, to, subject, body, from, cc, bcc]);
        this.mapSendEmailThroughOutlook.set(sessionId, childProcess);
        childProcess.stdout.on("data", (chunk) => {
            this.handleMessage(sessionId, chunk.toString());
        });
        childProcess.on("error", (error) => {
            this.handleError(sessionId, error);
        });
        childProcess.on("close", (code, signal) => {
            this.handleClose(sessionId, code, signal);
        });
    }
    abortScrapeTeamOutreach(sessionId, signal) {
        if (!sessionId)
            return new Error("sessionId should be");
        const process = this.mapScrapeTeamOutreach.get(sessionId);
        if (!process)
            return new Error("Scrape team outreach process is not running");
        const isKilled = process.kill(signal || "SIGABRT");
        if (isKilled) {
            this.mapScrapeTeamOutreach.delete(sessionId);
        }
        return isKilled;
    }
    abortScrapeLinkedinProfile(sessionId, signal) {
        if (!sessionId)
            return new Error("sessionId should be");
        const process = this.mapScrapeLinkedinProfile.get(sessionId);
        if (!process)
            return new Error("Scrape linkedin profile process is not running");
        const isKilled = process.kill(signal || "SIGABRT");
        if (isKilled) {
            this.mapScrapeLinkedinProfile.delete(sessionId);
        }
        return isKilled;
    }
    scrapeLinkedinProfile({ sessionId, userId }) {
        var _a;
        if (!sessionId)
            return new Error("sessionId should be");
        if (!userId)
            return new Error("userId should be");
        const scriptPath = ((_a = config_1.default.python_script.linkedin_profile_scraper) === null || _a === void 0 ? void 0 : _a.path) || "";
        const storePath = config_1.default.file_storage_path;
        if (!storePath)
            return new Error("File storage path not found");
        const fileStoragePath = this.createDir(path_1.default.join(storePath, userId));
        if (!fileStoragePath)
            return new Error("File storage path not found");
        const verifiedEmailFilename = "verified_email.json";
        const process = this.mapScrapeLinkedinProfile.get(sessionId);
        if (process)
            return new Error("Scrape linkedin profile already in progress");
        const childProcess = (0, child_process_1.spawn)("python", [scriptPath, fileStoragePath, verifiedEmailFilename]);
        this.mapScrapeLinkedinProfile.set(sessionId, childProcess);
        childProcess.stdout.on("data", (chunk) => {
            this.handleMessage(sessionId, chunk.toString());
        });
        childProcess.on("error", (error) => {
            this.handleError(sessionId, error);
        });
        childProcess.on("close", (code, signal) => {
            this.handleClose(sessionId, code, signal);
        });
        return childProcess.killed;
    }
    getScrapeTeamOutreachProcess(id) {
        if (!id)
            return new Error("id should be");
        const process = this.mapScrapeTeamOutreach.get(id);
        if (process === undefined)
            return new Error("Scrape team outreach process is not running");
        return process === null || process === void 0 ? void 0 : process.killed;
    }
    // Description: This method is used to send the input to the python script
    // It is used to send the input to the python script
    userInput(id, prompt, promptId) {
        if (!id)
            return new Error("id should be");
        if (!prompt)
            return new Error("data should be");
        const childProcess = this.getSessionChildProcess(id);
        if (!childProcess)
            return new Error("You have not started the email generation");
        const item = tempLocalResponseStorage.get(id);
        if (!item)
            return new Error("No data found");
        const index = item.findIndex((item) => item.id === promptId);
        if (index === -1)
            return new Error("Prompt id not found");
        childProcess.stdin.write(prompt);
        const itemData = item[index];
        const data = Object.assign(Object.assign({}, itemData), { agent: "admin", content: itemData.content + "\r\n" + prompt, requested_to: "bot", status: "in_progress", timestamp: Date.now() });
        const t = tempLocalResponseStorage.update(id, data, index);
        if (typeof t === "object") {
            this.eventEmitter.emit("json_data", { sessionId: id, data: t });
        }
        return t;
    }
    getSessionChildProcess(id) {
        if (!id)
            throw new Error("id should be");
        const childProcess = this.mapChildProcess.get(id);
        if (!childProcess)
            throw new Error("You don't have any session process");
        return childProcess;
    }
    // Description: This method is used to abort the email generation
    // It is used to abort the email generation
    abort(id, signal) {
        const childProcess = this.getSessionChildProcess(id);
        if (!childProcess)
            return new Error("You don't have any session process");
        const isKilled = childProcess.kill(signal || "SIGTERM");
        if (isKilled) {
            this.mapChildProcess.delete(id);
            tempLocalResponseStorage.clear(id);
        }
        return isKilled;
    }
    createDir(path) {
        const isPathExists = (0, fs_1.existsSync)(path);
        if (!isPathExists) {
            const t = (0, fs_1.mkdirSync)(path, { recursive: true });
            return t;
        }
        return path;
    }
}
exports.default = EmailGenerator;
