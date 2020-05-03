import {Collection, ItemDefinition, Request, Response, VariableScopeDefinition} from "postman-collection";
import {NewmanRunOptions} from "newman";

var _ = require('lodash'),
    handlebars = require('handlebars'),
    util = require('./util'),
    fs = require('fs'),
    path = require('path'),
    FILE_READ_OPTIONS = {encoding: 'utf8'},
    DARK_THEME = 'smoke-break-dashboard.hbs'

export interface NewmanSummary {
    cursor: Cursor;
    summary: Summary;
}

export interface Cursor {
    position: number;
    iteration: number;
    length: number;
    cycles: number;
    empty?: boolean;
    eof?: boolean;
    bof?: boolean;
    cr?: boolean;
    ref: string;
    httpRequestID?: string;
}

export interface Summary {
    collection: Collection;
    environment: VariableScopeDefinition;
    globals: VariableScopeDefinition;
    run: Run;
}

export interface Run {
    stats: Stats;
    timings: { [key: string]: number };
    executions: Execution[];
    transfers: Transfers;
    failures: any[];
    error: null;
}

export interface Execution {
    cursor: Cursor;
    item: ItemDefinition;
    request: Request;
    response: Response;
    id: string;
    assertions: Assertion[];
}

export interface Assertion {
    assertion: string;
    skipped: boolean;
}

export interface Stats {
    iterations: Assertions;
    items: Assertions;
    scripts: Assertions;
    prerequests: Assertions;
    requests: Assertions;
    tests: Assertions;
    assertions: Assertions;
    testScripts: Assertions;
    prerequestScripts: Assertions;
}

export interface Assertions {
    total: number;
    pending: number;
    failed: number;
}

export interface Transfers {
    responseTotal: number;
}


interface NewmanResponse {
    status: string
    code: number
    body?: string
}

interface RequestResult {
    requestUrl: string
    response: NewmanResponse
}

export interface RequestDiff {
    id: string;
    name: string;
    sampleA: RequestResult
    sampleB: RequestResult

}

/**
 * Reporter that outputs basic a HTML Report for smoke-break script
 *
 * @param {Object} newman - The collection run object, with event hooks for reporting run details.
 * @param {Object} options - A set of collection run options.
 * @returns {*}
 */
module.exports = function newmanSmokeBreakReporter(newman: any, options: NewmanRunOptions) {
    const htmlTemplate = path.join(__dirname, DARK_THEME);
    const compiler = handlebars.compile(fs.readFileSync(htmlTemplate, FILE_READ_OPTIONS));

    newman.on('assertion', function (err: boolean, o: { skipped: any; cursor: { ref: any; iteration: any; scriptId: any; }; assertion: any; error: any; item: { id: any; name: any; }; }) {
        if (err) { return; }

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


    newman.on('beforeDone', (err: any, event: NewmanSummary) => {
        if (err) return

        let executions = event.summary.run.executions

        executions.forEach((e:Execution)=> {
            if (e.response && typeof (e.response.toJSON) === 'function') {
                e.response = e.response.toJSON();
                let stream = e.response.stream;
                if (stream) {
                    e.response.body = Buffer.from(stream).toString();
                }
            }
        })

        let executionAs = _.filter(executions, function (e: any) {
            return e.cursor.iteration === 0;
        });

        let executionBs = _.filter(executions, function (e: any) {
            return e.cursor.iteration === 1;
        });

        let Results: RequestDiff[] = []
        event.summary.collection.forEachItem((i) => {
            let executionA: Execution = executionAs.find((e: Execution) => {
                return i.id === e.id
            })
            let executionB: Execution = executionBs.find((e: Execution) => {
                return i.id === e.id
            })
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
            })
        })

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
        }

        newman.exports.push({
            name: 'html-reporter-smoke-break',
            default: event.summary.collection.name + '-smoke-break.html',
            path: "",
            content: compiler(complied)
        });
    })
}
