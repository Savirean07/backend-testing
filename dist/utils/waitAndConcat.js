"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ResponseStorage = {
    responseTempStorage: "",
    concatResponseData: (data) => {
        ResponseStorage.responseTempStorage = ResponseStorage.responseTempStorage.concat(data);
    },
    getResponseData: () => {
        return ResponseStorage.responseTempStorage;
    },
    clearResponseData: () => {
        ResponseStorage.responseTempStorage = "";
    }
};
const concatResponseData = (data, { sapratorExpression, excludeConditionExpression, callback }) => {
    const items = data.split(sapratorExpression);
    for (let i = 0; i < items.length; i++) {
        const isExcluded = excludeConditionExpression.some(expression => expression.test(items[i]));
        if (i === items.length - 1 && !isExcluded) {
            ResponseStorage.concatResponseData(items[i]);
        }
        else {
            ResponseStorage.concatResponseData(items[i]);
            callback(ResponseStorage.getResponseData());
            ResponseStorage.clearResponseData();
        }
    }
};
exports.default = concatResponseData;
