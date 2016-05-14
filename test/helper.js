#!/usr/bin/env node
// @flow
// -*- coding: utf-8 -*-
'use strict'
// region imports
import {ChildProcess} from 'child_process'
import {Duplex as DuplexStream} from 'stream'
import * as qunit from 'qunit-cli'
// NOTE: Only needed for debugging this file.
try {
    module.require('source-map-support/register')
} catch (error) {}

import type {
    BuildConfiguration, ErrorHandlerFunction, Paths,
    TraverseFilesCallbackFunction
} from '../type'
import Helper from '../helper.compiled'
// endregion
qunit.module('helper')
qunit.load()
// region tests
// / boolean
qunit.test('isPlainObject', () => {
    qunit.ok(Helper.isPlainObject({}))
    qunit.ok(Helper.isPlainObject({a: 1}))
    /* eslint-disable no-new-object */
    qunit.ok(Helper.isPlainObject(new Object()))
    /* eslint-enable no-new-object */

    qunit.notOk(Helper.isPlainObject(new String()))
    qunit.notOk(Helper.isPlainObject(Object))
    qunit.notOk(Helper.isPlainObject(null))
    qunit.notOk(Helper.isPlainObject(0))
    qunit.notOk(Helper.isPlainObject(1))
    qunit.notOk(Helper.isPlainObject(true))
    qunit.notOk(Helper.isPlainObject(undefined))
})
qunit.test('isFunction', () => {
    qunit.ok(Helper.isFunction(Object))
    qunit.ok(Helper.isFunction(new Function('return 1')))
    qunit.ok(Helper.isFunction(function() {}))
    qunit.ok(Helper.isFunction(() => {}))

    qunit.notOk(Helper.isFunction(null))
    qunit.notOk(Helper.isFunction(false))
    qunit.notOk(Helper.isFunction(0))
    qunit.notOk(Helper.isFunction(1))
    qunit.notOk(Helper.isFunction(undefined))
    qunit.notOk(Helper.isFunction({}))
    qunit.notOk(Helper.isFunction(new Boolean()))
})
qunit.test('isFilePathInLocation', () => {
    qunit.ok(Helper.isFilePathInLocation('./', ['./']))
    qunit.ok(Helper.isFilePathInLocation('./', ['../']))

    qunit.notOk(Helper.isFilePathInLocation('../', ['./']))
})
// / endregion
qunit.test('extendObject', () => {
    qunit.deepEqual(Helper.extendObject({}), {})
    qunit.deepEqual(Helper.extendObject(true, {}), {})
    qunit.deepEqual(Helper.extendObject({a: 1}), {a: 1})
    qunit.deepEqual(Helper.extendObject({a: 1}, {a: 2}), {a: 2})
    qunit.deepEqual(Helper.extendObject({}, {a: 1}, {a: 2}), {a: 2})
    qunit.deepEqual(Helper.extendObject({}, {a: 1}, {a: 2}), {a: 2})
    qunit.deepEqual(Helper.extendObject(
        {a: 1, b: {a: 1}}, {a: 2, b: {b: 1}}
    ), {a: 2, b: {b: 1}})
    qunit.deepEqual(Helper.extendObject(
        true, {a: 1, b: {a: 1}}, {a: 2, b: {b: 1}}
    ), {a: 2, b: {a: 1, b: 1}})
    qunit.deepEqual(Helper.extendObject(
        true, {a: 1, b: {a: []}}, {a: 2, b: {b: 1}}
    ), {a: 2, b: {a: [], b: 1}})
    qunit.deepEqual(Helper.extendObject(
        true, {a: {a: [1, 2]}}, {a: {a: [3, 4]}}
    ), {a: {a: [3, 4]}})

    qunit.deepEqual(Helper.extendObject(new Map()), new Map())
    qunit.deepEqual(Helper.extendObject(true, new Map()), new Map())
    qunit.deepEqual(Helper.extendObject(
        new Map([['a', 1]])
    ), new Map([['a', 1]]))
    qunit.deepEqual(Helper.extendObject(
        new Map([['a', 1]]), new Map([['a', 2]])
    ), new Map([['a', 2]]))
    qunit.deepEqual(Helper.extendObject(
        new Map(), new Map([['a', 1]]), new Map([['a', 2]])
    ), new Map([['a', 2]]))
    qunit.deepEqual(Helper.extendObject(
        new Map(), new Map([['a', 1]]), new Map([['a', 2]])
    ), new Map([['a', 2]]))
    qunit.deepEqual(Helper.extendObject(
        new Map([['a', 1], ['b', new Map([['a', 1]])]]),
        new Map([['a', 2], ['b', new Map([['b', 1]])]])
    ), new Map([['a', 2], ['b', new Map([['b', 1]])]]))
    qunit.deepEqual(Helper.extendObject(
        true, new Map([['a', 1], ['b', new Map([['a', 1]])]]),
        new Map([['a', 2], ['b', new Map([['b', 1]])]])
    ), new Map([['a', 2], ['b', new Map([['a', 1], ['b', 1]])]]))
    qunit.deepEqual(Helper.extendObject(
        true, new Map([['a', 1], ['b', new Map([['a', []]])]]),
        new Map([['a', 2], ['b', new Map([['b', 1]])]])
    ), new Map([['a', 2], ['b', new Map([['a', []], ['b', 1]])]]))
    qunit.deepEqual(Helper.extendObject(
        true, new Map([['a', new Map([['a', [1, 2]]])]]),
        new Map([['a', new Map([['a', [3, 4]]])]])
    ), new Map([['a', new Map([['a', [3, 4]]])]]))
})
qunit.test('handleChildProcess', () => {
    /**
     * A mockup duplex stream for mocking "stdout" and "strderr" process
     * connections.
     */
    class MockupDuplexStream extends DuplexStream {
        /**
         * Triggers if contents from current stream should be red.
         * @param size - Number of bytes to read asynchronously.
         * @returns Red data.
         */
        _read(size:number):string {
            return `${size}`
        }
        /**
         * Triggers if contents should be written on current stream.
         * @param chunk - The chunk to be written. Will always be a buffer
         * unless the "decodeStrings" option was set to "false".
         * @param encoding - Specifies encoding to be used as input data.
         * @param callback - Will be called if data has been written.
         * @returns Returns "true" if more data could be written and "false"
         * otherwise.
         */
        _write(
            chunk:Buffer|string, encoding:string,
            callback:ErrorHandlerFunction
        ):boolean {
            callback(new Error('test'))
            return true
        }
    }
    const stdoutMockupDuplexStream:MockupDuplexStream =
        new MockupDuplexStream()
    const stderrMockupDuplexStream:MockupDuplexStream =
        new MockupDuplexStream()
    const childProcess:ChildProcess = new ChildProcess()
    childProcess.stdout = stdoutMockupDuplexStream
    childProcess.stderr = stderrMockupDuplexStream

    qunit.strictEqual(Helper.handleChildProcess(childProcess), childProcess)
})
qunit.test('walkDirectoryRecursivelySync', () => {
    const filePaths:Array<string> = []
    const callback:TraverseFilesCallbackFunction = (filePath:string) => {
        filePaths.push(filePath)
    }
    Helper.walkDirectoryRecursivelySync('./', callback)

    qunit.ok(filePaths.length > 0)
})
qunit.test('determineAssetType', () => {
    const paths:Paths = {
        asset: {
            cascadingStyleSheet: '',
            coffeeScript: '',
            data: '',
            font: '',
            image: '',
            javaScript: '',
            less: '',
            publicTarget: '',
            sass: '',
            scss: '',
            source: '',
            target: '',
            template: ''
        },
        context: '',
        ignore: [],
        manifest: '',
        source: '',
        target: '',
        tidyUp: []
    }
    const buildConfiguration:BuildConfiguration = {}

    qunit.strictEqual(Helper.determineAssetType(
        './', buildConfiguration, paths
    ), null)
    buildConfiguration.javaScript = {
        extension: 'js'
    }
    qunit.strictEqual(Helper.determineAssetType(
        'a.js', buildConfiguration, paths
    ), 'javaScript')
    qunit.strictEqual(Helper.determineAssetType(
        'a.css', buildConfiguration, paths
    ), null)
})
qunit.test('resolveBuildConfigurationFilePaths', () => {
    // TODO
    qunit.ok(true)
})
// endregion
// region vim modline
// vim: set tabstop=4 shiftwidth=4 expandtab:
// vim: foldmethod=marker foldmarker=region,endregion:
// endregion