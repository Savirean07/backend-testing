"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const emitter = new events_1.EventEmitter();
class Emitter {
    constructor() {
        this.botConversation = (id, data) => {
            emitter.emit("bot_conversation", data);
        };
        this.userConversation = (id, data) => {
            emitter.emit("user_conversation", id, data);
        };
        this.on = (event, callback) => {
            emitter.on(event, callback);
        };
        this.event = emitter;
    }
}
exports.default = new Emitter();
