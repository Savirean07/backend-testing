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
exports.createEmailHistoryModel = void 0;
const client_1 = require("@prisma/client");
const prismaClient = new client_1.PrismaClient();
const createEmailHistoryModel = () => {
    return {
        create: (emailHistory) => __awaiter(void 0, void 0, void 0, function* () {
            return yield prismaClient.cold_email_history.create({ data: { id: emailHistory.id, user_id: emailHistory.userId, timeline: emailHistory.timeline, createdAt: emailHistory.createdAt } });
        }),
        getByUserId: (userId) => __awaiter(void 0, void 0, void 0, function* () {
            return yield prismaClient.cold_email_history.findMany({ where: { user_id: userId } });
        }),
        getById: (id) => __awaiter(void 0, void 0, void 0, function* () {
            return yield prismaClient.cold_email_history.findUnique({ where: { id: id } });
        })
    };
};
exports.createEmailHistoryModel = createEmailHistoryModel;
