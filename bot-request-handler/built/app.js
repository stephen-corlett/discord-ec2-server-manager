"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lambdaHandler = async (event) => {
    const queries = JSON.stringify(event.queryStringParameters);
    return {
        statusCode: 200,
        body: `Queries: ${queries}`,
    };
};
exports.default = { lambdaHandler };
//# sourceMappingURL=app.js.map