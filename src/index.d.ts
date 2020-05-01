import { Collection, ItemDefinition, Request, Response, VariableScopeDefinition } from "postman-collection";
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
    timings: {
        [key: string]: number;
    };
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
    status: string;
    code: number;
    body?: string;
}
interface RequestResult {
    requestUrl: string;
    response: NewmanResponse;
}
export interface RequestDiff {
    id: string;
    name: string;
    sampleA: RequestResult;
    sampleB: RequestResult;
}
export {};
