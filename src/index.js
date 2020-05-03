"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _ = require('lodash'), handlebars = require('handlebars'), util = require('./util'), fs = require('fs'), path = require('path'), FILE_READ_OPTIONS = { encoding: 'utf8' }, DARK_THEME = 'smoke-break-dashboard.hbs';
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
    newman.on('assertion', function (err, o) {
        if (err) {
            return;
        }
        if (o.skipped) {
            newman.summary.skippedTests = newman.summary.skippedTests || [];
            newman.summary.skippedTests.push({
                cursor: {
                    ref: o.cursor.ref,
                    iteration: o.cursor.iteration,
                    scriptId: o.cursor.scriptId
                },
                assertion: o.assertion,
                skipped: o.skipped,
                error: o.error,
                item: {
                    id: o.item.id,
                    name: o.item.name
                }
            });
        }
    });
    newman.on('beforeDone', (err, event) => {
        if (err)
            return;
        let executions = event.summary.run.executions;
        executions.forEach((e) => {
            if (e.response && typeof (e.response.toJSON) === 'function') {
                e.response = e.response.toJSON();
                let stream = e.response.stream;
                if (stream) {
                    e.response.body = Buffer.from(stream).toString();
                }
            }
        });
        let executionAs = _.filter(executions, function (e) {
            return e.cursor.iteration === 0;
        });
        let executionBs = _.filter(executions, function (e) {
            return e.cursor.iteration === 1;
        });
        let Results = [];
        event.summary.collection.forEachItem((i) => {
            let executionA = executionAs.find((e) => {
                return i.id === e.id;
            });
            let executionB = executionBs.find((e) => {
                return i.id === e.id;
            });
            Results.push({
                id: i.id,
                name: i.name,
                sampleA: {
                    requestUrl: executionA.request.url.toString(),
                    response: {
                        status: executionA.response.status,
                        code: executionA.response.code,
                        body: executionA.response.body
                    }
                },
                sampleB: {
                    requestUrl: executionB.request.url.toString(),
                    response: {
                        status: executionB.response.status,
                        code: executionB.response.code,
                        body: executionB.response.body
                    }
                },
            });
        });
        let complied = {
            skipHeaders: [],
            skipSensitiveData: false,
            omitHeaders: false,
            noSyntaxHighlighting: false,
            timestamp: Date(),
            version: undefined,
            aggregations: Results,
            summary: {
                stats: event.summary.run.stats,
                collection: event.summary.collection,
                globals: typeof (event.summary.globals) === 'object' ? event.summary.globals : undefined,
                environment: event.summary.environment,
                failures: event.summary.run.failures,
                responseTotal: util.filesize(event.summary.run.transfers.responseTotal),
                responseAverage: util.prettyms(event.summary.run.timings.responseAverage),
                duration: util.prettyms(event.summary.run.timings.completed - event.summary.run.timings.started),
                skippedTests: undefined
            }
        };
        newman.exports.push({
            name: 'html-reporter-smoke-break',
            default: event.summary.collection.name + '-smoke-break.html',
            path: "",
            content: compiler(complied)
        });
    });
};
