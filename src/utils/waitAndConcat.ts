
const ResponseStorage = {
    responseTempStorage: "",
    concatResponseData: (data: string) => {
        ResponseStorage.responseTempStorage = ResponseStorage.responseTempStorage.concat(data)
    },
    getResponseData: () => {
        return ResponseStorage.responseTempStorage
    },
    clearResponseData: () => {
        ResponseStorage.responseTempStorage = ""
    }
}


const concatResponseData = (data: string, { sapratorExpression, excludeConditionExpression, callback }: { sapratorExpression: RegExp, excludeConditionExpression: RegExp[], callback: (data: string) => void }) => {
    const items = data.split(sapratorExpression)
    for (let i = 0; i < items.length; i++) {
        const isExcluded = excludeConditionExpression.some(expression => expression.test(items[i]))
        if (i === items.length - 1 && !isExcluded) {
            ResponseStorage.concatResponseData(items[i])
        } else {
            ResponseStorage.concatResponseData(items[i])
            callback(ResponseStorage.getResponseData())
            ResponseStorage.clearResponseData()
        }
    }
};

export default concatResponseData;