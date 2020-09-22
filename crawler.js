const request = require('request-promise');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const urlParse = require('url').parse;

const { dbConnectionString } = require('./constants');
const CrawledUrlModel = require('./model/crawledUrl.model');

mongoose.connect(dbConnectionString, { useNewUrlParser: true }, (err) => {
    if (err) console.log(err);
    else {
        console.log("connected");
    }
});

const baseUrl = "https://medium.com";
const unvisitedUrls = new Set();
const visitedUrls = new Set();
let concurrency = 0;

async function updateUrlDetails(url) {
    const parsedUrl = urlParse(url, true);
    const query = { url: parsedUrl.protocol + "//" + parsedUrl.hostname + parsedUrl.pathname };
    const updateObj = { $inc: { occuranceCount: 1 }, $addToSet: { queryParams: { $each: Object.keys(parsedUrl.query) } } };
    await CrawledUrlModel.updateOne(query, updateObj, { upsert: true });
}

const increaseConcurrencyCount = () => concurrency++;
const decreaseConcurrencyCount = () => concurrency--;
const logConcurrency = () => console.log("url processing count", concurrency, Date.now());

async function crawl(visitingUrl) {
    try {
        increaseConcurrencyCount();
        logConcurrency();
        visitedUrls.add(visitingUrl);
        unvisitedUrls.delete(visitingUrl);
        const response = await request.get(visitingUrl);
        const $ = cheerio.load(response);
        const arr = $('a').toArray().map(a => a.attribs).map(a => a.href);
        const absoluteUrls = arr.filter(a => a.startsWith(baseUrl));
        const relativeUrls = arr.filter(a => a.startsWith("/"));
        for (let url of absoluteUrls) {
            if (!visitedUrls.has(url)) {
                unvisitedUrls.add(url);
            }
            await updateUrlDetails(url);
        }
        for (let url of relativeUrls) {
            const actualUrl = baseUrl + url;
            if (!visitedUrls.has(actualUrl)) {
                unvisitedUrls.add(actualUrl);
            }
            await updateUrlDetails(actualUrl);
        }
        decreaseConcurrencyCount();
        logConcurrency();
        for (let url of unvisitedUrls) {
            if (concurrency === 5) break;
            crawl(url);
        }
    }
    catch (err) {
        console.log('error for url', visitingUrl);
        decreaseConcurrencyCount();
        for (let url of unvisitedUrls) {
            if (concurrency === 5) break;
            crawl(url);
        }
    }
}


crawl(baseUrl);