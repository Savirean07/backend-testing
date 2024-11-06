"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPythonScript = void 0;
const child_process_1 = require("child_process");
const runPythonScript = (args) => {
    return new Promise((resolve, reject) => {
        const pythonProcess = (0, child_process_1.spawn)('python', [...args]);
        let stdoutData = '';
        let stderrData = '';
        pythonProcess.stdout.on('data', (data) => {
            stdoutData += data;
        });
        pythonProcess.stderr.on('data', (data) => {
            stderrData += data;
        });
        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Python script exited with code ${code} and error ${stderrData} and args ${args} and stdout ${stdoutData}`));
            }
            else {
                resolve(stdoutData);
            }
        });
        pythonProcess.on('error', (error) => {
            reject(error);
        });
    });
};
exports.runPythonScript = runPythonScript;
