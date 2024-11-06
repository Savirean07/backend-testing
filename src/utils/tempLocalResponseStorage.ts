import path from "path";
import config from "../config";
import { writeFileSync, readFileSync } from "fs";

type TempLocalResponseStorage<K extends string | number | symbol, T> = {
    store: Record<K, T[]>;
    push: (key: K, value: T, options?: { userId?: string }) => void;
    update: (key: K, value: T, index: number) => T | Error;
    get: (key: K) => T[] | undefined;
    clear: (key: K) => void;
    clearAll: () => void;
    getEmailHistory: (userId: string) => Record<K, T[]>;
};

const createTempLocalResponseStorage = <K extends string | number | symbol, T>(): TempLocalResponseStorage<K, T> => {
    const storage: TempLocalResponseStorage<K, T> = {
        store: {} as Record<K, T[]>,
        push: (key, value, options) => {
            if (!storage.store[key]) storage.store[key] = [];
            storage.store[key].push(value);
        },
        update: (key, value, index) => {
            if (!storage.store[key]) return new Error("Data not found")
            if (index === -1) return new Error("Index is out of range")
            storage.store[key][index] = value;
            return storage.store[key][index];
        },
        get: (key) => {
            return storage.store[key];
        },
        clear: (key) => {
            storage.store[key] = [];
        },
        clearAll: () => {
            storage.store = {} as Record<K, T[]>;
        },
        getEmailHistory: (userId: string) => {
            try {
                const fileStoragePath = config.file_storage_path || "./";
                const filePath = path.join(fileStoragePath, userId, `emails_history.json`);
                const data = readFileSync(filePath, "utf-8");
                const txtToJson = JSON.parse(data) as Record<K, T[]>;
                return txtToJson;
            } catch (error) {
                console.log(error)
                return {} as Record<K, T[]>;
            }
        }
    };

    return storage;
};

export default createTempLocalResponseStorage;
