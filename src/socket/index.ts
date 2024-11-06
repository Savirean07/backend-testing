import { EmailGenerator } from "../lead-generator";
import { authenticateSocket, CustomSocket } from "../auth";
import { randomUUID } from "crypto";
import { IEmailData } from "../lead-generator/emailGenerator";
import { join } from "path";
import { Server } from "socket.io";
import profileAnalystSocket from "./profileAnalyst";

export const createSessionIdWithPrefix = (userId: string, clientSessionID: string, options?: { prefix?: string }) => {
  const { prefix = "" } = options || {};
  if (!clientSessionID) {
    throw new Error("clientSessionID did not received")
  }
  if (!userId) {
    throw new Error("userId did not received")
  }
  return prefix.concat(userId, "-", clientSessionID);
}

export const getPrefixAndClientId = (id: string, separator: string) => {
  const namespace = id.split(separator)[0]
  const clientId = id.split(separator)[1]
  return { namespace, clientId }
}

export const socket = (io: Server) => {
  profileAnalystSocket(io)
  const emailGenerator = new EmailGenerator();

  emailGenerator.on("json_data", (data) => {
    const { sessionId, data: streamData } = data;
    const { namespace } = getPrefixAndClientId(sessionId, "_$")
    io.of(namespace).to(sessionId).emit("stream", streamData);
  });

  emailGenerator.on("error", (data) => {
    const { sessionId, message } = data;
    const { namespace } = getPrefixAndClientId(sessionId, "_$")
    io.of(namespace).to(sessionId).emit("error", { message });
  });

  emailGenerator.on("close", (data) => {
    const { sessionId, message, code } = data;
    const { namespace } = getPrefixAndClientId(sessionId, "_$")
    io.of(namespace).to(sessionId).emit("close", { message, code });
  });

  emailGenerator.on("message", (data) => {
    const { sessionId, message } = data;
    const { namespace } = getPrefixAndClientId(sessionId, "_$")
    io.of(namespace).to(sessionId).emit("message", { message });
  });

  emailGenerator.on("file_changed", (data) => {
    const { sessionId, ...rest } = data;
    const { namespace } = getPrefixAndClientId(sessionId, "_$")
    io.of(namespace).to(sessionId).emit("file_changed", { ...rest });
  });

  io.of("/")
    .use(authenticateSocket)
    .on("connection", (socket: CustomSocket) => {
      const { user } = socket;
      if (!user?.oid) {
        socket.disconnect();
        return;
      }
      let userId = user?.oid;
      const namespace = socket.nsp.name
      const prefix = namespace + "_$"
      socket.on("register", ({ clientSessionID }, callback) => {
        if (!callback || typeof callback !== "function") {
          socket.emit("error", { message: "callback is not a function" })
          return
        }
        if (!clientSessionID) {
          clientSessionID = randomUUID();
        }
        try {
          const sessionId = createSessionIdWithPrefix(userId, clientSessionID, { prefix });
          if (socket.rooms.has(sessionId)) {
            socket.emit("error", { message: "You are already connected" })
            return
          }
          socket.join(sessionId);
          callback({ clientSessionID, message: "Registered successfully" });
        } catch (error: any) {
          socket.emit("error", { message: error.message });
        }
      });

      socket.on("inti_prompt", ({ prompt, clientSessionID }, callback) => {
        try {
          const sessionId = createSessionIdWithPrefix(userId, clientSessionID, { prefix });
          if (!socket.rooms.has(sessionId)) {
            throw new Error("You are not authorized")
          };
          const process = emailGenerator.generate({ sessionId, userId });
          callback({ code: 200, message: "Prompt sent successfully" });
        } catch (error: any) {
          socket.emit("error", { message: error.message });
          callback({ code: 404, message: error.message });
        }
      })

      socket.on("send_email_through_outlook", ({ emailData, clientSessionID }: { emailData: IEmailData, clientSessionID: string }, callback) => {
        try {
          const sessionId = createSessionIdWithPrefix(userId, clientSessionID, { prefix });
          if (!socket.rooms.has(sessionId)) {
            throw new Error("You are not authorized")
          };
          if (!emailData) throw new Error("emailData is required")
          const response = emailGenerator.sendEmailThroughOutlook({ sessionId, userId, emailData });
          if (response instanceof Error) {
            socket.emit("error", { message: response.message });
            callback({ code: 404, message: response.message });
          }
          callback({ code: 200, message: "Email sent successfully" });
        } catch (error: any) {
          socket.emit("error", { message: error.message });
          callback({ code: 404, message: error.message });
        }
      });

      socket.on("admin_prompt_response", ({ prompt = "", clientSessionID, promptId }, callback) => {
        try {
          const sessionId = createSessionIdWithPrefix(userId, clientSessionID, { prefix });
          if (!socket.rooms.has(sessionId)) {
            throw new Error("You are not authorized")
          };
          const response = emailGenerator.userInput(sessionId, prompt + "\n", promptId);
          if (response instanceof Error) {
            socket.emit("error", { message: response.message });
            callback({ code: 404, message: response.message });
          }
          callback({ code: 200, message: "Prompt sent successfully" });
        } catch (error: any) {
          socket.emit("error", { message: error.message });
          callback({ code: 404, message: error.message });
        }
      });

      socket.on("pull_data", ({ clientSessionID }, callback) => {
        try {
          if (typeof callback !== "function") throw new Error("callback is not a function in pull_data");
          const sessionId = createSessionIdWithPrefix(userId, clientSessionID, { prefix });
          if (!socket.rooms.has(sessionId)) throw new Error("You are not authorized to pull data");
          const data = emailGenerator.pullData(sessionId);
          if (data instanceof Error) throw new Error(data.message);
          callback({ clientSessionID, data });
        } catch (error: any) {
          callback({ clientSessionID, message: error.message });
        }
      });

      socket.on("stop_role_mail_composer", ({ clientSessionID }, callback) => {
        try {
          const sessionId = createSessionIdWithPrefix(userId, clientSessionID, { prefix });
          const isAborted = emailGenerator.abort(sessionId, "SIGABRT");
          if (isAborted instanceof Error) throw new Error(isAborted.message);
          callback({ clientSessionID, message: "Aborted successfully" });
        } catch (error: any) {
          socket.emit("error", { message: error.message });
        }
      });

      socket.on("disconnect", () => {
        console.log("socket disconnected: ", socket.id, " user: ", socket.user?.oid);
      });
    });

  io.of("/ws/role/url-scraper")
    .use(authenticateSocket)
    .on("connection", (socket: CustomSocket) => {
      const { user } = socket;
      if (!user?.oid) {
        socket.emit("error", { message: "You are not authorized" });
        socket.disconnect();
        return;
      }
      const { oid: userId } = user;
      const userDir = join(__dirname, "..", "assets", userId)
      emailGenerator.createDir(userDir)
      const namespace = socket.nsp.name
      const prefix = namespace + "_$"
      socket.on("subscribe", ({ clientSessionID }, callback) => {
        try {
          const sessionId = createSessionIdWithPrefix(userId, clientSessionID, { prefix });
          socket.join(sessionId);
          callback({ code: 200, message: "Subscribed successfully" });
        } catch (error: any) {
          socket.emit("error", { message: error.message });
        }
      });

      socket.on("prompt", ({ clientSessionID }, callback) => {
        try {
          const sessionId = createSessionIdWithPrefix(userId, clientSessionID, { prefix });
          if (!socket.rooms.has(sessionId)) throw new Error("You are not authorized to scrape linkedin profile");
          const process = emailGenerator.scraperEmailLinkedinAndVerifier({ sessionId, userId });
          if (process instanceof Error) throw new Error(process.message);
          callback({ code: 200, message: "Prompt sent successfully" });
        } catch (error: any) {
          socket.emit("error", { message: error.message });
        }
      });

      socket.on("abort", ({ clientSessionID }, callback) => {
        try {
          const sessionId = createSessionIdWithPrefix(userId, clientSessionID, { prefix });
          if (!socket.rooms.has(sessionId)) throw new Error("You are not authorized to abort with clientSessionID: " + clientSessionID);
          emailGenerator.abortScrapeTeamOutreach(sessionId);
          callback({ clientSessionID, message: "Aborted successfully" });
        } catch (error: any) {
          socket.emit("error", { message: error.message });
        }
      });

      socket.on("is_in_progress", ({ clientSessionID }, callback) => {
        try {
          const sessionId = createSessionIdWithPrefix(userId, clientSessionID, { prefix });
          if (!socket.rooms.has(sessionId)) throw new Error("You are not authorized to check if in progress with clientSessionID: " + clientSessionID);
          const inProgress = emailGenerator.getScrapeTeamOutreachProcess(sessionId);
          if (inProgress instanceof Error) throw new Error(inProgress.message);
          callback(!inProgress);
        } catch (error: any) {
          callback(false);
        }
      });
    });

  // io.of("/ws/role/linkedin-profile-scraper")
  //   .use(authenticateSocket)
  //   .on("connection", (socket: CustomSocket) => {
  //     const { user } = socket;
  //     if (!user?.oid) {
  //       socket.disconnect();
  //       return;
  //     }
  //     const { oid: userId } = user;
  //     const namespace = socket.nsp.name
  //     const prefix = namespace + "_$"
  //     socket.on("prompt", ({ prompt, clientSessionID }, callback) => {
  //       try {
  //         const sessionId = createSessionIdWithPrefix(userId, clientSessionID, { prefix });
  //         if (!socket.rooms.has(sessionId)) throw new Error("You are not authorized to scrape linkedin profile");
  //         const process = emailGenerator.scrapeLinkedinProfile({ sessionId, userId });
  //         if (process instanceof Error) throw new Error(process.message);
  //         if (!process) throw new Error("something went wrong in running process for scraping linkedin profile");
  //         callback({ code: 200, message: "Prompt sent successfully" });
  //       } catch (error: any) {
  //         socket.emit("error", { message: error.message });
  //       }
  //     });

  //     socket.on("abort", ({ clientSessionID }, callback) => {
  //       try {
  //         const sessionId = createSessionIdWithPrefix(userId, clientSessionID, { prefix });
  //         if (!socket.rooms.has(sessionId)) throw new Error("You are not authorized to abort with clientSessionID: " + clientSessionID);
  //         emailGenerator.abortScrapeLinkedinProfile(sessionId, "SIGABRT");
  //         callback({ clientSessionID, message: "Aborted successfully" });
  //       } catch (error: any) {
  //         socket.emit("error", { message: error.message });
  //       }
  //     });

  //     socket.on("subscribe", ({ clientSessionID }, callback) => {
  //       try {
  //         const sessionId = createSessionIdWithPrefix(userId, clientSessionID, { prefix });
  //         socket.join(sessionId);
  //         callback({ code: 200, message: "Subscribed successfully" });
  //       } catch (error: any) {
  //         socket.emit("error", { message: error.message });
  //       }
  //     });
  //   });

};
