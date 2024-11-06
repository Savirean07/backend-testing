import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { EventEmitter } from "events";

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

export default class LeadScrapperTeam {
  childProcess: ChildProcessWithoutNullStreams | null;
  csvFilePath: string;

  private eventEmitter: EventEmitter;

  constructor(csvFilePath: string) {
    this.eventEmitter = new EventEmitter();
    this.childProcess = null;
    this.csvFilePath = csvFilePath;
  }

  // Overload definitions
  on(event: "error", callback: (error: Error | null) => void): void;
  on(event: "close", callback: (code: number | null) => void): void;
  on(event: "json_data", callback: (data: any | null) => void): void;
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
  private handleJsonData(data: Buffer) {
    const bufferToString = data.toString();

  }

  // Description: This method is used to handle the exit event from the python script
  // It is used to emit the exit event to the event emitter
  private handleExit(code: number | null, signal: string | null) {
    if (code === null) {
      const exitMessage = signal
        ? {
            status: processStatus.STOPPED,
            message: `Email generation failed with signal: ${signal}`,
          }
        : { status: processStatus.STOPPED, message: "Email generation failed" };
      this.eventEmitter.emit("exit", exitMessage);
    } else {
      const exitMessage =
        code > 0
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
  private handleError(error: Error | null) {
    if (error) {
      const errorMessage =
        typeof error === "string"
          ? { status: "error", message: error }
          : { status: "error", message: error?.message };
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
  private handleClose(code: number | null, signal: string | null) {
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
    const closeMessage =
      code > 0
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
  async generate() {
    try {
      this.childProcess = spawn("python", [
        "d://lead_generation_agentic_team/Outreach Agentic Team/main.py",
        this.csvFilePath,
      ]);
      this.childProcess.stdout.on("data", this.handleJsonData.bind(this));
      this.childProcess.stderr.on("data", this.handleError.bind(this));
      this.childProcess.on("error", this.handleError.bind(this));
      this.childProcess.on("close", this.handleClose.bind(this));
      this.childProcess.on("exit", this.handleExit.bind(this));
    } catch (error) {
      console.log("Error in email generation", error);
    }
  }

  // Description: This method is used to send the input to the python script
  // It is used to send the input to the python script
  userInput(data: string) {
    if (!this.childProcess) return;
    this.childProcess.stdin.write(data);
  }

  // Description: This method is used to abort the email generation
  // It is used to abort the email generation
  abort() {
    if (!this.childProcess) return;
    if (this.childProcess.killed) return;
    this.childProcess.kill("SIGINT");
    this.childProcess = null;
  }
}
