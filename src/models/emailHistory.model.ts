import { PrismaClient } from "@prisma/client";

const prismaClient = new PrismaClient();

export interface IEmailHistory {
    id: string;
    userId: string;
    timeline: string;
    createdAt: Date;
}

export interface IEmailHistoryModel<IEmailHistory> {
    create(emailHistory: IEmailHistory): Promise<IEmailHistory>;
    getByUserId(userId: string): Promise<IEmailHistory[]>;
    getById(id: string): Promise<IEmailHistory | null>;
}

export const createEmailHistoryModel = () => {
    return {
        create: async (emailHistory: IEmailHistory) => {
            return await prismaClient.cold_email_history.create({ data: { id: emailHistory.id, user_id: emailHistory.userId, timeline: emailHistory.timeline, createdAt: emailHistory.createdAt } });
        },
        getByUserId: async (userId: string) => {
            return await prismaClient.cold_email_history.findMany({ where: { user_id: userId } });
        },
        getById: async (id: string) => {
            return await prismaClient.cold_email_history.findUnique({ where: { id: id } });
        }

    }
}
