import { spawn } from 'child_process'

export const runPythonScript = (args: string[]): Promise<string> => {

    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [...args])

        let stdoutData = ''
        let stderrData = ''

        pythonProcess.stdout.on('data', (data) => {
            stdoutData += data
        })

        pythonProcess.stderr.on('data', (data) => {
            stderrData += data
        })

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Python script exited with code ${code} and error ${stderrData} and args ${args} and stdout ${stdoutData}`))
            } else {
                resolve(stdoutData)
            }
        })

        pythonProcess.on('error', (error) => {
            reject(error)
        })
    })
}