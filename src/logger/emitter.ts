import { EventEmitter } from "events";

const emitter = new EventEmitter();

class Emitter {
  event: EventEmitter;
  constructor() {
    this.event = emitter;
  }

  botConversation = (id: string, data: object): void => {
    emitter.emit("bot_conversation", data);
  };

  userConversation = (id: string, data: object): void => {
    emitter.emit("user_conversation", id, data);
  };

  on = (event: string, callback: (...args: any[]) => void): void => {
    emitter.on(event, callback);
  };
}

export default new Emitter();
