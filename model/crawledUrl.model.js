const Schema = require('mongoose').Schema;
const mongooseModel = require('mongoose').model;

const crawledUrlSchema = new Schema({
    url: { type: String, unique: true, required: true, index: true },
    occuranceCount: { type: Number, default: 0 },
    queryParams: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongooseModel('crawledUrls', crawledUrlSchema, 'crawledUrls');