"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const config_1 = __importDefault(require("../config"));
const fs_1 = require("fs");
const createTempLocalResponseStorage = () => {
    const storage = {
        store: {},
        push: (key, value, options) => {
            if (!storage.store[key])
                storage.store[key] = [];
            storage.store[key].push(value);
        },
        update: (key, value, index) => {
            if (!storage.store[key])
                return new Error("Data not found");
            if (index === -1)
                return new Error("Index is out of range");
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
            storage.store = {};
        },
        getEmailHistory: (userId) => {
            try {
                const fileStoragePath = config_1.default.file_storage_path || "./";
                const filePath = path_1.default.join(fileStoragePath, userId, `emails_history.json`);
                const data = (0, fs_1.readFileSync)(filePath, "utf-8");
                const txtToJson = JSON.parse(data);
                return txtToJson;
            }
            catch (error) {
                console.log(error);
                return {};
            }
        }
    };
    return storage;
};
exports.default = createTempLocalResponseStorage;
