import path from "path";
import { randomUUID } from "crypto";
import { EventEmitter } from "events";
import { appendFileSync, createReadStream, existsSync, mkdirSync, readFileSync, ReadStream, watch, watchFile, writeFileSync } from "fs";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";

import { AgentData, TransformData } from "./textParser";
import concatResponseData from "../utils/waitAndConcat";
import createTempLocalResponseStorage from "../utils/tempLocalResponseStorage";
import config from "../config";

interface IAgentData extends AgentData {
  id: string;
  timestamp: number;
}

export interface IEmailData {
  subject: string;
  body: string;
  to: string;
  from: string;
  cc: string;
  bcc: string;
}

const tempLocalResponseStorage = createTempLocalResponseStorage<string, IAgentData>();

const processStatus = {
  SUCCESS: "success",
  ERROR: "error",
  IN_PROGRESS: "in_progress",
  WAITING: "waiting",
  STOPPED: "stopped",
};

export default class EmailGenerator extends TransformData {
  responseTempStorage: string
  isThisResponseEnded: boolean
  counter: number
  private eventEmitter: EventEmitter;
  private mapChildProcess: Map<string, ChildProcessWithoutNullStreams>
  private mapScrapeTeamOutreach: Map<string, ChildProcessWithoutNullStreams>
  private mapScrapeLinkedinProfile: Map<string, ChildProcessWithoutNullStreams>
  private mapSendEmailThroughOutlook: Map<string, ChildProcessWithoutNullStreams>

  constructor() {
    super();
    this.eventEmitter = new EventEmitter();
    this.responseTempStorage = "";
    this.isThisResponseEnded = true;
    this.counter = 0;
    this.mapChildProcess = new Map()
    this.mapScrapeTeamOutreach = new Map()
    this.mapScrapeLinkedinProfile = new Map()
    this.mapSendEmailThroughOutlook = new Map()
  }

  emit(event: "json_data", data: { data?: AgentData, sessionId: string }): void;
  emit(event: "error", data: { message: string, sessionId: string }): void;
  emit(event: "abort", id: string, signal: NodeJS.Signals): void;
  emit(event: "close", data: { code: number | null, sessionId: string }): void;
  emit(event: "exit", data: { status: keyof typeof processStatus, message: string }): void;
  emit(event: "user_input", id: string, data: string): void;
  emit(event: string, ...args: any[]): void {
    this.eventEmitter.emit(event, ...args);
  }

  // Overload definitions
  on(event: "error", callback: (data: { message: string, sessionId: string }) => void): void;
  on(event: "file_changed", callback: (data: { fileData?: string, sessionId: string, message: string }) => void): void;
  on(event: "message", callback: (data: { message: string, sessionId: string }) => void): void;
  on(event: "abort", callback: (id: string, signal: NodeJS.Signals) => void): void;
  on(event: "close", callback: (data: { code: number | null, sessionId: string, message: string }) => void): void;
  on(event: "json_data", callback: (data: { data: AgentData | null, sessionId: string }) => void): void;
  on(
    event: "exit",
    callback: (data: {
      status: keyof typeof processStatus;
      message: string;
    }) => void
  ): void;
  on(event: string, callback: (...args: any[]) => void): void {
    this.eventEmitter.on(event, callback);
  }

  // Event handler methods
  // Description: This method is used to handle the json data from the python script
  // It is used to transform the data from the python script and emit the data
  // It is used to emit the data to the event emitter
  private handleJsonData(sessionId: string, userId: string, data: Buffer) {
    const response = data.toString();
    try {
      concatResponseData(response, {
        sapratorExpression: /-{4,}/,
        excludeConditionExpression: [/TERMINATE/i, /Please give feedback to/i],
        callback: async (data) => {
          let result = this.transformData(data, this.counter) as IAgentData
          if (result && sessionId) {
            result.timestamp = Date.now()
            result.id = randomUUID()
            const refinedData = this.refineData(result)
            tempLocalResponseStorage.push(sessionId, refinedData, { userId: userId })
            this.eventEmitter.emit("json_data", { sessionId: sessionId, data: refinedData })
          }
        }
      })
    } catch (error: any) {
      this.eventEmitter.emit("error", { sessionId: sessionId, message: typeof error === "string" ? error : error?.message })
    }
    this.counter++;
  }

  private refineData(data: IAgentData) {
    if (/^email|^search_parameters/i.test(data.response_type)) {
      return { ...data, content: null }
    }
    return data
  }

  // Description: This method is used to handle the exit event from the python script
  // It is used to emit the exit event to the event emitter
  private handleExit(sessionId: string, code: number | null, signal: string | null) {
    if (code === null) {
      const exitMessage = signal ? `Email generation failed with signal: ${signal}` : "Email generation failed"
      this.eventEmitter.emit("exit", { sessionId, exitMessage });
    } else {
      const exitMessage =
        code > 0
          ? "Process is exit with code: " + code
          : "Process Completed";
      this.eventEmitter.emit("exit", { sessionId, exitMessage });
    }
  }

  // Description: This method is used to handle the error event from the python script
  // It is used to emit the error event to the event emitter
  private handleError(sessionId: string, error: Error) {
    if (!sessionId) return;
    if (error) {
      const errorMessage = typeof error === "string" ? error : error?.message;
      this.eventEmitter.emit("error", { sessionId: sessionId, message: errorMessage });
      return;
    }
    this.eventEmitter.emit("error", {
      sessionId: sessionId,
      message: "An unknown error occurred"
    });
  }

  public pullData(id: string) {
    const data = tempLocalResponseStorage.get(id)
    if (!data) return new Error("No timeline history found for this session")
    return data
  }

  // Description: This method is used to handle the close event from the python script
  // It is used to emit the close event to the event emitter
  private handleClose(sessionId: string, code: number | null, signal: string | null) {
    if (!sessionId) return;
    if (code === null) {
      const message = signal
        ? `Email generation failed with signal: ${signal}`
        : "Email generation failed";
      this.eventEmitter.emit("close", { sessionId, message, code: signal });
      return;
    }
    const message =
      code > 0
        ? "Process is exit with code: " + code
        : "Process Completed";
    this.eventEmitter.emit("close", { sessionId, message, code });
  }

  private handleMessage(sessionId: string, message: string) {
    this.eventEmitter.emit("message", { sessionId, message })
  }

  // Description: This method is used to generate the email
  // It is used to spawn a new process and communicate with it
  // It is used to emit the data to the event emitter
  generate({ prompt, sessionId, userId }: { prompt?: string, sessionId: string, userId: string }) {
    if (!sessionId) return;
    if (this.mapChildProcess.has(sessionId)) {
      this.emit("error", { message: "Email generation already in progress", sessionId: sessionId })
      return;
    }

    const scriptPath = config.python_script.outreach?.path
    if (!scriptPath) return new Error("Python script path not found")

    const storePath = config.file_storage_path
    if (!storePath) return new Error("File storage path not found")

    const fileStoragePath = this.createDir(path.join(storePath, userId))
    if (!fileStoragePath) return new Error("File storage path not found")

    const verifiedEmailsPath = path.join(fileStoragePath, "verified_emails.csv")
    const isVerifiedEmailsPathExists = existsSync(verifiedEmailsPath)
    if (!isVerifiedEmailsPathExists) return new Error("Verified emails path not found")

    const childProcess = spawn("python3", [scriptPath, fileStoragePath, verifiedEmailsPath]);
    this.mapChildProcess.set(sessionId, childProcess)
    childProcess.stdout.on("data", (chunk) => {
      this.handleJsonData(sessionId, userId, chunk)
    });
    childProcess.stderr.on("data", (chunk) => {
      this.handleError(sessionId, new Error(chunk.toString()))
    });
    childProcess.on("error", (error) => {
      this.handleError(sessionId, error)
    });
    childProcess.on("close", (code, signal) => {
      this.handleClose(sessionId, code, signal)
    });
    childProcess.on("exit", (code, signal) => {
      this.handleExit(sessionId, code, signal)
    });
    return childProcess.killed
  }

  // Description: This method is used to scrape the linkedin profile and verify the email
  // It is used to spawn a new process and communicate with it
  // It is used to emit the data to the event emitter
  // It is used to watch the file and emit the file changed event to the event emitter
  scraperEmailLinkedinAndVerifier({ sessionId, userId }: { sessionId: string, userId: string }) {
    if (!sessionId) return new Error("sessionId should be")
    if (!userId) return new Error("userId should be")
    const scriptPath = config.python_script.url_scraper?.path
    if (!scriptPath) return new Error("Python script path not found")

    const storePath = config.file_storage_path
    if (!storePath) return new Error("File storage path not found")

    const fileStoragePath = this.createDir(path.join(storePath, userId))
    if (!fileStoragePath) return new Error("File storage path not found")

    let prevDataSize = 0
    const csvFileName = "verified_emails.csv"

    const process = this.mapScrapeTeamOutreach.get(sessionId)
    if (process) return new Error("Scrape team outreach already in progress")
    const childProcess = spawn("python", [scriptPath, fileStoragePath]);
    this.mapScrapeTeamOutreach.set(sessionId, childProcess)

    try {
      const fileDataList = readFileSync(fileStoragePath + "/" + csvFileName, "utf8").split("\n")
      prevDataSize = fileDataList.length
      const moreLeads = prevDataSize > 11 ? `${prevDataSize - 10} more leads\n` : ""
      const fileDataString = "\`\`\`txt\n" + moreLeads + fileDataList.slice(-10).join("\n----------------------\n") + "\n\`\`\`"
      this.eventEmitter.emit("file_changed", { sessionId, fileData: fileDataString, message: "Previous generated leads (and more generation in progress)" })
    } catch (error: any) {
      this.eventEmitter.emit("file_changed", { sessionId, message: "Lead generation is in progress" })
    }

    childProcess.stdout.on("data", (chunk) => {
      this.handleMessage(sessionId, chunk.toString())
    });

    childProcess.stderr.on("data", (chunk) => {
      this.handleError(sessionId, new Error(chunk.toString()))
    });
    childProcess.on("error", (error) => {
      this.handleError(sessionId, error)
    });
    childProcess.on("exit", (code, signal) => {
      this.handleExit(sessionId, code, signal)
    })
    childProcess.on("close", (code, signal) => {
      try {
        this.eventEmitter.emit("file_changed", { sessionId, message: "Leads generation completed" })
        this.handleClose(sessionId, code, signal)
        this.mapScrapeTeamOutreach.delete(sessionId)
      } catch (error: any) {
        this.handleError(sessionId, new Error(typeof error === "string" ? error : error?.message))
      }
    });


    watchFile(fileStoragePath + "/" + csvFileName, () => {
      try {
        if (childProcess.killed) return
        const fileData = readFileSync(fileStoragePath + "/" + csvFileName, "utf8").split("\n").filter((item) => item.trim() !== "")
        const lastData = fileData.at(-1)
        if (!lastData) return
        if (lastData) {
          const fileDataString = "\`\`\`txt\n" + lastData + "\n\`\`\`"
          this.eventEmitter.emit("file_changed", { sessionId, fileData: fileDataString, message: "New generated leads (and more generation in progress)" })
        }
      } catch (error: any) {
        this.handleError(sessionId, new Error(typeof error === "string" ? error : "File not found"))
      }
    })
    return childProcess.killed
  }

  sendEmailThroughOutlook({ sessionId, userId, emailData }: { sessionId: string, userId: string, emailData: IEmailData }) {
    if (!sessionId) return new Error("sessionId should be")
    if (!userId) return new Error("userId should be")
    if (!emailData) return new Error("emailData should be")
    const { subject, body, to, from, cc, bcc } = emailData

    const outlookScriptPath = config.python_script.outlook?.path || ""

    const childProcess = spawn("python", [outlookScriptPath, to, subject, body, from, cc, bcc]);

    this.mapSendEmailThroughOutlook.set(sessionId, childProcess)
    childProcess.stdout.on("data", (chunk) => {
      this.handleMessage(sessionId, chunk.toString())
    });
    childProcess.on("error", (error) => {
      this.handleError(sessionId, error)
    });
    childProcess.on("close", (code, signal) => {
      this.handleClose(sessionId, code, signal)
    });
  }

  abortScrapeTeamOutreach(sessionId: string, signal?: NodeJS.Signals) {
    if (!sessionId) return new Error("sessionId should be")
    const process = this.mapScrapeTeamOutreach.get(sessionId)
    if (!process) return new Error("Scrape team outreach process is not running")
    const isKilled = process.kill(signal || "SIGABRT")
    if (isKilled) {
      this.mapScrapeTeamOutreach.delete(sessionId)
    }
    return isKilled
  }

  abortScrapeLinkedinProfile(sessionId: string, signal?: NodeJS.Signals) {
    if (!sessionId) return new Error("sessionId should be")
    const process = this.mapScrapeLinkedinProfile.get(sessionId)
    if (!process) return new Error("Scrape linkedin profile process is not running")
    const isKilled = process.kill(signal || "SIGABRT")
    if (isKilled) {
      this.mapScrapeLinkedinProfile.delete(sessionId)
    }
    return isKilled
  }

  scrapeLinkedinProfile({ sessionId, userId }: { sessionId: string, userId: string }) {
    if (!sessionId) return new Error("sessionId should be")
    if (!userId) return new Error("userId should be")
    const scriptPath = config.python_script.linkedin_profile_scraper?.path || ""
    const storePath = config.file_storage_path
    if (!storePath) return new Error("File storage path not found")

    const fileStoragePath = this.createDir(path.join(storePath, userId))
    if (!fileStoragePath) return new Error("File storage path not found")

    const verifiedEmailFilename = "verified_email.json"

    const process = this.mapScrapeLinkedinProfile.get(sessionId)
    if (process) return new Error("Scrape linkedin profile already in progress")
    const childProcess = spawn("python", [scriptPath, fileStoragePath, verifiedEmailFilename]);

    this.mapScrapeLinkedinProfile.set(sessionId, childProcess)
    childProcess.stdout.on("data", (chunk) => {
      this.handleMessage(sessionId, chunk.toString())
    });
    childProcess.on("error", (error) => {
      this.handleError(sessionId, error)
    });
    childProcess.on("close", (code, signal) => {
      this.handleClose(sessionId, code, signal)
    });
    return childProcess.killed
  }





  getScrapeTeamOutreachProcess(id: string): boolean | Error {
    if (!id) return new Error("id should be")
    const process = this.mapScrapeTeamOutreach.get(id)
    if (process === undefined) return new Error("Scrape team outreach process is not running")
    return process?.killed
  }

  // Description: This method is used to send the input to the python script
  // It is used to send the input to the python script
  userInput(id: string, prompt: string, promptId: string) {
    if (!id) return new Error("id should be")
    if (!prompt) return new Error("data should be")
    const childProcess = this.getSessionChildProcess(id)
    if (!childProcess) return new Error("You have not started the email generation")

    const item = tempLocalResponseStorage.get(id)
    if (!item) return new Error("No data found")
    const index = item.findIndex((item) => item.id === promptId)
    if (index === -1) return new Error("Prompt id not found")
    childProcess.stdin.write(prompt)
    const itemData = item[index]
    const data = { ...itemData, agent: "admin", content: itemData.content + "\r\n" + prompt, requested_to: "bot", status: "in_progress", timestamp: Date.now() } as IAgentData
    const t = tempLocalResponseStorage.update(id, data, index)
    if (typeof t === "object") {
      this.eventEmitter.emit("json_data", { sessionId: id, data: t })
    }
    return t
  }

  getSessionChildProcess(id: string): ChildProcessWithoutNullStreams | undefined {
    if (!id) throw new Error("id should be")
    const childProcess = this.mapChildProcess.get(id)
    if (!childProcess) throw new Error("You don't have any session process")
    return childProcess
  }

  // Description: This method is used to abort the email generation
  // It is used to abort the email generation
  abort(id: string, signal: NodeJS.Signals): boolean | Error {
    const childProcess = this.getSessionChildProcess(id)
    if (!childProcess) return new Error("You don't have any session process")
    const isKilled = childProcess.kill(signal || "SIGTERM")
    if (isKilled) {
      this.mapChildProcess.delete(id)
      tempLocalResponseStorage.clear(id)
    }
    return isKilled
  }
  createDir(path: string): string | undefined {
    const isPathExists = existsSync(path)
    if (!isPathExists) {
      const t = mkdirSync(path, { recursive: true })
      return t
    }
    return path
  }
}
