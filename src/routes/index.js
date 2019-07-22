"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var bingoRouter = require("./bingo");
var router = express_1.Router();
router.use('/bingo', bingoRouter);
exports.default = router;
