import { EventEmitter } from "stream";
import { appendFileSync, readFileSync } from "fs";

const logFilePath = "./logger.csv";
const jsonRegex = /^\{.*\}$/;

export type LoggerEvent =
  | "log"
  | "error"
  | "warn"
  | "info"
  | "message"
  | "data";
export interface LoggerLog {
  (message: string, data?: unknown): void;
}
export interface LoggerMessage {
  (message: string, data?: unknown): void;
}
export interface LoggerData {
  (message: string, data: unknown): void;
}
export interface LoggerError {
  (error: Error): void;
}
export interface LoggerWarn {
  (warn: string, data?: unknown): void;
}

const logStore: {
  timestamp: number;
  type: LoggerEvent;
  message: string;
  data: unknown;
}[] = [];

const handlePushLog = (type: LoggerEvent, message: string, data: unknown) => {
  const csvData = `${Date.now()},${type},${message.replace(
    /,/g,
    "~"
  )},${JSON.stringify(data || "").replace(/,/g, "~")}\r\n`;
  appendFileSync(logFilePath, csvData, { encoding: "utf-8", flag: "a" });
};

const handleGetLogs = () => {
  const csvData = readFileSync(logFilePath, { encoding: "utf-8" });
  return csvData?.split(/\r\n/).map((log) => {
    let [timestamp, type, message, data] = log.split(",") as [
      string | number,
      string,
      string,
      string
    ];
    message = message?.replace(/~/g, ",");
    data = data?.replace(/~/g, ",");
    timestamp = Number(timestamp);
    if (data && jsonRegex.test(data)) {
      try {
        data = JSON.parse(data);
      } catch (error) {
        data = data;
      }
    }
    return { timestamp, type, message, data } as {
      timestamp: number;
      type: LoggerEvent;
      message: string;
      data: object | string | number | boolean | unknown;
    };
  });
};

export const eventEmitter = new EventEmitter();

class Logger {
  constructor(private readonly eventEmitter: EventEmitter) {}

  log(message: string, data?: unknown) {
    this.eventEmitter.emit("log", message, data);
    handlePushLog("log", message, data);
  }

  error(message: string, data?: unknown) {
    this.eventEmitter.emit("error", message, data);
    handlePushLog("error", message, data);
  }

  warn(message: string, data?: unknown) {
    this.eventEmitter.emit("warn", message, data);
    handlePushLog("warn", message, data);
  }

  info(message: string, data?: unknown) {
    this.eventEmitter.emit("info", message, data);
    handlePushLog("info", message, data);
  }

  message(message: string, data?: unknown) {
    this.eventEmitter.emit("message", message, data);
    handlePushLog("message", message, data);
  }

  data(message: string, data: unknown) {
    this.eventEmitter.emit("data", message, data);
    handlePushLog("data", message, data);
  }

  on(event: 'data', listener: (message: string, data: unknown) => void): void;
  on(event: 'log' | 'warn' | 'info' | 'message', listener: (message: string, data?: unknown) => void): void;
  on(event: 'error', listener: (error: Error) => void): void;
  on(event: LoggerEvent, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  getLogs({
    type,
    message,
    data,
  }: { type?: LoggerEvent; message?: string; data?: unknown } = {}) {
    const logs = handleGetLogs();
    return logs.filter((log) => {
      return (
        (type ? log.type === type : true) &&
        (message ? log.message === message : true) &&
        (data ? log.data === data : true)
      );
    });
  }
}

export const logger = new Logger(eventEmitter);