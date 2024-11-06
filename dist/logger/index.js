"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.eventEmitter = void 0;
const stream_1 = require("stream");
const fs_1 = require("fs");
const logFilePath = "./logger.csv";
const jsonRegex = /^\{.*\}$/;
const logStore = [];
const handlePushLog = (type, message, data) => {
    const csvData = `${Date.now()},${type},${message.replace(/,/g, "~")},${JSON.stringify(data || "").replace(/,/g, "~")}\r\n`;
    (0, fs_1.appendFileSync)(logFilePath, csvData, { encoding: "utf-8", flag: "a" });
};
const handleGetLogs = () => {
    const csvData = (0, fs_1.readFileSync)(logFilePath, { encoding: "utf-8" });
    return csvData === null || csvData === void 0 ? void 0 : csvData.split(/\r\n/).map((log) => {
        let [timestamp, type, message, data] = log.split(",");
        message = message === null || message === void 0 ? void 0 : message.replace(/~/g, ",");
        data = data === null || data === void 0 ? void 0 : data.replace(/~/g, ",");
        timestamp = Number(timestamp);
        if (data && jsonRegex.test(data)) {
            try {
                data = JSON.parse(data);
            }
            catch (error) {
                data = data;
            }
        }
        return { timestamp, type, message, data };
    });
};
exports.eventEmitter = new stream_1.EventEmitter();
class Logger {
    constructor(eventEmitter) {
        this.eventEmitter = eventEmitter;
    }
    log(message, data) {
        this.eventEmitter.emit("log", message, data);
        handlePushLog("log", message, data);
    }
    error(message, data) {
        this.eventEmitter.emit("error", message, data);
        handlePushLog("error", message, data);
    }
    warn(message, data) {
        this.eventEmitter.emit("warn", message, data);
        handlePushLog("warn", message, data);
    }
    info(message, data) {
        this.eventEmitter.emit("info", message, data);
        handlePushLog("info", message, data);
    }
    message(message, data) {
        this.eventEmitter.emit("message", message, data);
        handlePushLog("message", message, data);
    }
    data(message, data) {
        this.eventEmitter.emit("data", message, data);
        handlePushLog("data", message, data);
    }
    on(event, listener) {
        this.eventEmitter.on(event, listener);
    }
    getLogs({ type, message, data, } = {}) {
        const logs = handleGetLogs();
        return logs.filter((log) => {
            return ((type ? log.type === type : true) &&
                (message ? log.message === message : true) &&
                (data ? log.data === data : true));
        });
    }
}
exports.logger = new Logger(exports.eventEmitter);
