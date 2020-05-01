"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _ = require('lodash'), handlebars = require('handlebars'), fs = require('fs'), path = require('path'), FILE_READ_OPTIONS = { encoding: 'utf8' }, DARK_THEME = 'diff-dashboard.hbs';
/**
 * Reporter that outputs basic logs to DIFF (default: newman-run-report.csv).
 *
 * @param {Object} newman - The collection run object, with event hooks for reporting run details.
 * @param {Object} options - A set of collection run options.
 * @param {String} options.export - The path to which the summary object must be written.
 * @returns {*}
 */
module.exports = function newmanDiffReporter(newman, options) {
    const htmlTemplate = path.join(__dirname, DARK_THEME);
    const compiler = handlebars.compile(fs.readFileSync(htmlTemplate, FILE_READ_OPTIONS));
    newman.on('beforeDone', (err, event) => {
        if (err)
            return;
        console.log("++++++++++++++++++++++++++++++");
        console.log(event);
        console.log("++++++++++++++++++++++++++++++");
        console.log(event.summary.run);
        let executions = event.summary.run.executions;
        let executionAs = _.filter(executions, function (e) { return e.cursor.iteration === 0; });
        let executionBs = _.filter(executions, function (e) { return e.cursor.iteration === 1; });
        let Results = [];
        event.summary.collection.forEachItem((i) => {
            var _a, _b;
            let executionA = executionAs.find((e) => { return i.id === e.id; });
            let executionB = executionBs.find((e) => { return i.id === e.id; });
            Results.push({
                id: i.id,
                name: i.name,
                sampleA: { requestUrl: executionA.request.url.toString(), response: { status: executionA.response.status, code: executionA.response.code, body: (_a = executionA.response.stream) === null || _a === void 0 ? void 0 : _a.toString() } },
                sampleB: { requestUrl: executionB.request.url.toString(), response: { status: executionB.response.status, code: executionB.response.code, body: (_b = executionB.response.stream) === null || _b === void 0 ? void 0 : _b.toString() } },
            });
        });
        Results.forEach((r) => {
            console.log(r.name);
            console.log(r.sampleA.requestUrl, '\t', r.sampleA.response.code, '\t', r.sampleA.response.body);
            console.log(r.sampleB.requestUrl, '\t', r.sampleB.response.code, '\t', r.sampleB.response.body);
            console.log('\n');
        });
        newman.exports.push({
            name: 'html-reporter-htmlextra',
            default: 'newman_htmlextra.html',
            path: "",
            content: compiler(Results)
        });
    });
};
