"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const _1 = require(".");
const auth_1 = require("../auth");
const config_1 = __importDefault(require("../config"));
const lead_generator_1 = require("../lead-generator");
const profileAnalystSocket = (io) => {
    var _a, _b, _c;
    const profileAnalyst = new lead_generator_1.ProfileAnalyst();
    const namespace = ((_c = (_b = (_a = config_1.default === null || config_1.default === void 0 ? void 0 : config_1.default.routes) === null || _a === void 0 ? void 0 : _a.socket) === null || _b === void 0 ? void 0 : _b.profile_analyst) === null || _c === void 0 ? void 0 : _c.namespace) || "/ws/role/profile-analyst";
    profileAnalyst.on("data", (data) => {
        io.of(namespace).to(data.clientId).emit("data", data.data);
    });
    profileAnalyst.on("error", (error) => {
        io.of(namespace).to(error.clientId).emit("error", error);
    });
    profileAnalyst.on("close", (close) => {
        io.of(namespace).to(close.clientId).emit("close", close);
    });
    profileAnalyst.on("message", (data) => {
        io.of(namespace).to(data.clientId).emit("message", data.message);
    });
    profileAnalyst.on("exit", (data) => {
        io.of(namespace).to(data.clientId).emit("exit", data);
    });
    profileAnalyst.on("info", (info) => {
        io.of(namespace).to(info.clientId).emit("info", info);
    });
    profileAnalyst.on("debug", (debug) => {
        io.of(namespace).to(debug.clientId).emit("debug", debug);
    });
    io.of(namespace)
        .use(auth_1.authenticateSocket)
        .on("connection", (socket) => {
        const { user } = socket;
        const { oid } = user || {};
        if (!oid) {
            socket._error("User has not object id");
            socket.disconnect();
            return;
        }
        const prefix = namespace + "_$";
        socket.on("register", ({ client_session_id }, callback) => {
            try {
                const clientSessionId = client_session_id || (0, crypto_1.randomUUID)();
                const isValid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientSessionId);
                if (!isValid) {
                    throw new Error("Invalid client_session_id");
                }
                const sessionId = (0, _1.createSessionIdWithPrefix)(clientSessionId, oid, { prefix });
                socket.join(sessionId);
                callback({ status: "registered", client_session_id: clientSessionId, session_id: sessionId });
            }
            catch (error) {
                callback({ status: "error", message: error.message });
            }
        });
        socket.on("fetch_file_data", ({ client_session_id }, callback) => {
            try {
                if (!client_session_id) {
                    throw new Error("client_session_id is required");
                }
                const sessionId = (0, _1.createSessionIdWithPrefix)(client_session_id, oid, { prefix });
                const data = profileAnalyst.getProfileData({ clientId: sessionId, userId: oid });
                callback({ status: "data", data: [] });
            }
            catch (error) {
                callback({ status: "error", message: error.message });
            }
        });
        socket.on("start_profile_analyst", ({ client_session_id }, callback) => {
            try {
                if (!client_session_id) {
                    throw new Error("client_session_id is required");
                }
                const sessionId = (0, _1.createSessionIdWithPrefix)(client_session_id, oid, { prefix });
                const isRunning = profileAnalyst.analyzeProfile({ clientId: sessionId, userId: oid });
                if (!isRunning) {
                    throw new Error("Failed to start profile analysis");
                }
                callback({ status: "running" });
            }
            catch (error) {
                callback({ status: "error", message: error.message });
            }
        });
        socket.on("stop", ({ client_session_id }, callback) => {
            try {
                if (!client_session_id) {
                    throw new Error("client_session_id is required");
                }
                const sessionId = (0, _1.createSessionIdWithPrefix)(client_session_id, oid, { prefix });
                const isAborted = profileAnalyst.abort(sessionId, "SIGABRT");
                if (!isAborted) {
                    throw new Error("Failed to abort profile analysis");
                }
                callback({ status: "stopped" });
            }
            catch (error) {
                callback({ status: "error", message: error.message });
            }
        });
    });
};
exports.default = profileAnalystSocket;
