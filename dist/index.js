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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const socket_io_1 = require("socket.io");
const http_1 = __importDefault(require("http"));
const index_1 = __importDefault(require("./routes/index"));
const socket_1 = require("./socket");
const passport_1 = __importDefault(require("passport"));
const port = process.env.PORT || 3000; 
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: { origin: "*", allowedHeaders: ["*"] }
});
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', '*');
    next();
});
app.use(express_1.default.json());
app.use(passport_1.default.initialize());
function runServer() {
    return __awaiter(this, void 0, void 0, function* () {
        (0, socket_1.socket)(io);
        yield (0, index_1.default)(app);
         server.listen(port, () => {
            console.log(`Server running on port ${port}`);
         });
        //  server.listen(PORT, () => __awaiter(this, void 0, void 0, function* () {
        //     console.log(`The server is Running on port ${PORT}`);
        //  }));
        // server.listen(port, () => {
        //     console.log(`Server running on port ${port}`);
        //    }));
    });
}
runServer();
exports.default = app;
