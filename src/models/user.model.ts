import { PrismaClient } from "@prisma/client";

const prismaClient = new PrismaClient();

export interface IUser {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserModel<IUser> {
    findByEmail(email: string): Promise<IUser | null>;
    create(user: IUser): Promise<IUser>;
}

export const createUserModel = (prismaClient: PrismaClient): IUserModel<IUser> => {
    return {
        findByEmail: async (email: string) => {
            return await prismaClient.user.findUnique({ where: { email } });
        },
        create: async (user: IUser) => {
            return await prismaClient.user.create({ data: user });
        }
    }
}

const userModel = createUserModel(new PrismaClient());

userModel.findByEmail("test@test.com").then((user) => {
    console.log(user?.email);
});