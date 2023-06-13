#! /usr/bin/env node
import fs from 'fs'
import Path from 'path'
import { program } from 'commander'
import buildTools from '../index.js'
const __dirname = Path.resolve();


program.on('--help', () => {
    console.log('run uniapp-cli-pack-tool <command> --help show details')
})

program.version(JSON.parse(fs.readFileSync(Path.join(__dirname, '/node_modules/uniapp-cli-pack-tool/package.json'))).version)

program
    .option('-o, --output [type]', '输出目录')
    .option('-t, --type [type]', '打包类型，默认云打包')

program.parse(process.argv);

const options = program.opts()

buildTools.init(options)
