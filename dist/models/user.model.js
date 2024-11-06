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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserModel = void 0;
const client_1 = require("@prisma/client");
const prismaClient = new client_1.PrismaClient();
const createUserModel = (prismaClient) => {
    return {
        findByEmail: (email) => __awaiter(void 0, void 0, void 0, function* () {
            return yield prismaClient.user.findUnique({ where: { email } });
        }),
        create: (user) => __awaiter(void 0, void 0, void 0, function* () {
            return yield prismaClient.user.create({ data: user });
        })
    };
};
exports.createUserModel = createUserModel;
const userModel = (0, exports.createUserModel)(new client_1.PrismaClient());
userModel.findByEmail("test@test.com").then((user) => {
    console.log(user === null || user === void 0 ? void 0 : user.email);
});
