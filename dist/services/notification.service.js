"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = createNotification;
const db_1 = require("../lib/db");
async function createNotification(input) {
    var _a;
    return (0, db_1.createNotification)(Object.assign(Object.assign({}, input), { read: (_a = input.read) !== null && _a !== void 0 ? _a : false, createdAt: input.createdAt || new Date() }));
}
