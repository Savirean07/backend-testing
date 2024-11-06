import { randomUUID } from "crypto"
import { createSessionIdWithPrefix } from "."
import { authenticateSocket, CustomSocket } from "../auth"
import config from "../config"
import { ProfileAnalyst } from "../lead-generator"
import { Server } from "socket.io"


type StartCallbackError = {
    status: "error"
    message: string | Error
}
type StartCallbackSuccess = {
    status: "running" | "stopped"
}
type RegisterCallback = {
    status: "registered"
    client_session_id: string
    session_id: string
}
type GetProfileDataCallback = {
    status: "data"
    data: any
}
type StartCallback = (status: StartCallbackSuccess | StartCallbackError | RegisterCallback | GetProfileDataCallback) => void



const profileAnalystSocket = (io: Server) => {
    const profileAnalyst = new ProfileAnalyst()

    const namespace = config?.routes?.socket?.profile_analyst?.namespace || "/ws/role/profile-analyst"

    profileAnalyst.on("data", (data) => {
        io.of(namespace).to(data.clientId).emit("data", data.data)
    })

    profileAnalyst.on("error", (error) => {
        io.of(namespace).to(error.clientId).emit("error", error)
    })

    profileAnalyst.on("close", (close) => {
        io.of(namespace).to(close.clientId).emit("close", close)
    })

    profileAnalyst.on("message", (data) => {
        io.of(namespace).to(data.clientId).emit("message", data.message)
    })

    profileAnalyst.on("exit", (data) => {
        io.of(namespace).to(data.clientId).emit("exit", data)
    })

    profileAnalyst.on("info", (info) => {
        io.of(namespace).to(info.clientId).emit("info", info)
    })

    profileAnalyst.on("debug", (debug) => {
        io.of(namespace).to(debug.clientId).emit("debug", debug)
    })

    io.of(namespace)
        .use(authenticateSocket)
        .on("connection", (socket: CustomSocket) => {
            const { user } = socket
            const { oid } = user || {}
            if (!oid) {
                socket._error("User has not object id")
                socket.disconnect()
                return
            }

            const prefix = namespace + "_$"

            socket.on("register", ({ client_session_id }: { client_session_id: string }, callback: StartCallback) => {
                try {
                    const clientSessionId = client_session_id || randomUUID()
                    const isValid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientSessionId)
                    if (!isValid) {
                        throw new Error("Invalid client_session_id")
                    }
                    const sessionId = createSessionIdWithPrefix(clientSessionId, oid, { prefix })
                    socket.join(sessionId)
                    callback({ status: "registered", client_session_id: clientSessionId, session_id: sessionId })
                } catch (error: any) {
                    callback({ status: "error", message: error.message })
                }
            })

            socket.on("fetch_file_data", ({ client_session_id }: { client_session_id: string }, callback: StartCallback) => {
                try {
                    if (!client_session_id) {
                        throw new Error("client_session_id is required")
                    }
                    const sessionId = createSessionIdWithPrefix(client_session_id, oid, { prefix })
                    const data = profileAnalyst.getProfileData({ clientId: sessionId, userId: oid })
                    callback({ status: "data", data: [] })
                } catch (error: any) {
                    callback({ status: "error", message: error.message })
                }
            })

            socket.on("start_profile_analyst", ({ client_session_id }: { client_session_id: string }, callback: StartCallback) => {
                try {
                    if (!client_session_id) {
                        throw new Error("client_session_id is required")
                    }
                    const sessionId = createSessionIdWithPrefix(client_session_id, oid, { prefix })
                    const isRunning = profileAnalyst.analyzeProfile({ clientId: sessionId, userId: oid })
                    if (!isRunning) {
                        throw new Error("Failed to start profile analysis")
                    }
                    callback({ status: "running" })
                } catch (error: any) {
                    callback({ status: "error", message: error.message })
                }
            })

            socket.on("stop", ({ client_session_id }: { client_session_id: string }, callback: StartCallback) => {
                try {
                    if (!client_session_id) {
                        throw new Error("client_session_id is required")
                    }
                    const sessionId = createSessionIdWithPrefix(client_session_id, oid, { prefix })
                    const isAborted = profileAnalyst.abort(sessionId, "SIGABRT")
                    if (!isAborted) {
                        throw new Error("Failed to abort profile analysis")
                    }
                    callback({ status: "stopped" })
                } catch (error: any) {
                    callback({ status: "error", message: error.message })
                }
            })
        })

}

export default profileAnalystSocket
