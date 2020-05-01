import {Collection, ItemDefinition, Request, Response, VariableScopeDefinition} from "postman-collection";
import {NewmanRunOptions} from "newman";

var _ = require('lodash'),
handlebars = require('handlebars'),
fs = require('fs'),
path = require('path'),
FILE_READ_OPTIONS = { encoding: 'utf8' },
DARK_THEME = 'diff-dashboard.hbs'

export interface NewmanSummary {
  cursor:  Cursor;
  summary: Summary;
}

export interface Cursor {
  position:       number;
  iteration:      number;
  length:         number;
  cycles:         number;
  empty?:         boolean;
  eof?:           boolean;
  bof?:           boolean;
  cr?:            boolean;
  ref:            string;
  httpRequestID?: string;
}

export interface Summary {
  collection: Collection;
  environment: VariableScopeDefinition;
  globals: VariableScopeDefinition;
  run: Run;
}

export interface Run {
  stats:      Stats;
  timings:    { [key: string]: number };
  executions: Execution[];
  transfers:  Transfers;
  failures:   any[];
  error:      null;
}

export interface Execution {
  cursor:     Cursor;
  item:       ItemDefinition;
  request:    Request;
  response:   Response;
  id:         string;
  assertions: Assertion[];
}

export interface Assertion {
  assertion: string;
  skipped: boolean;
}

export interface Stats {
  iterations:        Assertions;
  items:             Assertions;
  scripts:           Assertions;
  prerequests:       Assertions;
  requests:          Assertions;
  tests:             Assertions;
  assertions:        Assertions;
  testScripts:       Assertions;
  prerequestScripts: Assertions;
}

export interface Assertions {
  total:   number;
  pending: number;
  failed:  number;
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
  id:  string;
  name: string;
  sampleA: RequestResult
  sampleB: RequestResult

}

/**
 * Reporter that outputs basic logs to DIFF (default: newman-run-report.csv).
 *
 * @param {Object} newman - The collection run object, with event hooks for reporting run details.
 * @param {Object} options - A set of collection run options.
 * @param {String} options.export - The path to which the summary object must be written.
 * @returns {*}
 */

module.exports = function newmanDiffReporter (newman: any, options: NewmanRunOptions) {
  const htmlTemplate = path.join(__dirname, DARK_THEME);
  const compiler = handlebars.compile(fs.readFileSync(htmlTemplate, FILE_READ_OPTIONS));

  newman.on('beforeDone', (err: any, event: NewmanSummary) => {
    if (err) return

    console.log("++++++++++++++++++++++++++++++")
    console.log(event)

    console.log("++++++++++++++++++++++++++++++")
    console.log(event.summary.run)

    let executions = event.summary.run.executions
    let executionAs = _.filter(executions, function(e:any) { return e.cursor.iteration ===0; });
    let executionBs = _.filter(executions, function(e:any) { return e.cursor.iteration ===1; });

    let Results: RequestDiff[] = []
    event.summary.collection.forEachItem((i) => {
      let executionA:Execution = executionAs.find((e:Execution) => {return i.id === e.id})
      let executionB:Execution = executionBs.find((e:Execution) => {return i.id === e.id})
      Results.push({
        id: i.id,
        name: i.name,
        sampleA: {requestUrl: executionA.request.url.toString(), response:{status: executionA.response.status, code:executionA.response.code, body: executionA.response.stream?.toString()}},
        sampleB: {requestUrl: executionB.request.url.toString(), response:{status: executionB.response.status, code:executionB.response.code, body: executionB.response.stream?.toString()}},
      })
    })

    Results.forEach((r:RequestDiff) => {
      console.log(r.name)
      console.log(r.sampleA.requestUrl,'\t',r.sampleA.response.code ,'\t', r.sampleA.response.body)
      console.log(r.sampleB.requestUrl,'\t',r.sampleB.response.code ,'\t', r.sampleB.response.body)
      console.log('\n')
    })

    newman.exports.push({
      name: 'html-reporter-htmlextra',
      default: 'newman_htmlextra.html',
      path: "",
      content: compiler(Results)
    });
  })
}
