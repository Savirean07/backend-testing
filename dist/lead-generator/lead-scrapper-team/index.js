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
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const events_1 = require("events");
const processStatus = {
    SUCCESS: "success",
    ERROR: "error",
    IN_PROGRESS: "in_progress",
    WAITING: "waiting",
    STOPPED: "stopped",
};
// Description: This class is used to generate emails using the python script
// It uses the child_process module to spawn a new process and communicate with it
// It also uses the event emitter module to emit events when the process is done
// It also uses the TransformData class to transform the data from the python script
class LeadScrapperTeam {
    constructor(csvFilePath) {
        this.eventEmitter = new events_1.EventEmitter();
        this.childProcess = null;
        this.csvFilePath = csvFilePath;
    }
    on(event, callback) {
        this.eventEmitter.on(event, callback);
    }
    // Event handler methods
    // Description: This method is used to handle the json data from the python script
    // It is used to transform the data from the python script and emit the data
    // It is used to emit the data to the event emitter
    handleJsonData(data) {
        const bufferToString = data.toString();
    }
    // Description: This method is used to handle the exit event from the python script
    // It is used to emit the exit event to the event emitter
    handleExit(code, signal) {
        if (code === null) {
            const exitMessage = signal
                ? {
                    status: processStatus.STOPPED,
                    message: `Email generation failed with signal: ${signal}`,
                }
                : { status: processStatus.STOPPED, message: "Email generation failed" };
            this.eventEmitter.emit("exit", exitMessage);
        }
        else {
            const exitMessage = code > 0
                ? {
                    status: processStatus.ERROR,
                    message: "Process is exit with code: " + code,
                }
                : { status: processStatus.SUCCESS, message: "Process Completed" };
            this.eventEmitter.emit("exit", exitMessage);
        }
    }
    // Description: This method is used to handle the error event from the python script
    // It is used to emit the error event to the event emitter
    handleError(error) {
        if (error) {
            const errorMessage = typeof error === "string"
                ? { status: "error", message: error }
                : { status: "error", message: error === null || error === void 0 ? void 0 : error.message };
            this.eventEmitter.emit("error", errorMessage);
            return;
        }
        this.eventEmitter.emit("error", {
            status: "error",
            message: "An unknown error occurred",
        });
    }
    // Description: This method is used to handle the close event from the python script
    // It is used to emit the close event to the event emitter
    handleClose(code, signal) {
        if (code === null) {
            const closeMessage = signal
                ? {
                    status: processStatus.STOPPED,
                    message: `Email generation failed with signal: ${signal}`,
                }
                : {
                    status: processStatus.STOPPED,
                    message: "Email generation failed",
                };
            this.eventEmitter.emit("close", closeMessage);
            return;
        }
        const closeMessage = code > 0
            ? {
                status: processStatus.ERROR,
                message: "Process is exit with code: " + code,
            }
            : {
                status: processStatus.SUCCESS,
                message: "Process Completed",
            };
        this.eventEmitter.emit("close", closeMessage);
    }
    // Description: This method is used to generate the email
    // It is used to spawn a new process and communicate with it
    // It is used to emit the data to the event emitter
    generate() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.childProcess = (0, child_process_1.spawn)("python", [
                    "d://lead_generation_agentic_team/Outreach Agentic Team/main.py",
                    this.csvFilePath,
                ]);
                this.childProcess.stdout.on("data", this.handleJsonData.bind(this));
                this.childProcess.stderr.on("data", this.handleError.bind(this));
                this.childProcess.on("error", this.handleError.bind(this));
                this.childProcess.on("close", this.handleClose.bind(this));
                this.childProcess.on("exit", this.handleExit.bind(this));
            }
            catch (error) {
                console.log("Error in email generation", error);
            }
        });
    }
    // Description: This method is used to send the input to the python script
    // It is used to send the input to the python script
    userInput(data) {
        if (!this.childProcess)
            return;
        this.childProcess.stdin.write(data);
    }
    // Description: This method is used to abort the email generation
    // It is used to abort the email generation
    abort() {
        if (!this.childProcess)
            return;
        if (this.childProcess.killed)
            return;
        this.childProcess.kill("SIGINT");
        this.childProcess = null;
    }
}
exports.default = LeadScrapperTeam;
