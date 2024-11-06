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
exports.user = void 0;
const express_1 = __importDefault(require("express"));
const index_1 = __importDefault(require("./user/index"));
exports.user = index_1.default;
const path_1 = __importDefault(require("path"));
const lead_roles_1 = __importDefault(require("./lead-roles"));
const file_manager_1 = __importDefault(require("./file-manager"));
const email_manager_1 = require("./email-manager");
const auth_1 = __importDefault(require("./auth"));
exports.default = (app) => __awaiter(void 0, void 0, void 0, function* () {
    app.use("/doc", express_1.default.static(path_1.default.join(__dirname, "../../public")));
    app.use("/role", lead_roles_1.default);
    app.use("/user", index_1.default);
    app.use("/file", file_manager_1.default);
    app.use("/mail-manager", email_manager_1.EMAIL_MANAGER_ROUTER);
    app.use("/auth", auth_1.default);
});
