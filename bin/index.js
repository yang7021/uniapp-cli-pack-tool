#! /usr/bin/env node
import fs from 'fs'
import { program } from 'commander'
import buildTools from '../index.js'


program.on('--help', () => {
    console.log('run uniapp-cli-pack-tool <command> --help show details')
})

program
    .command('run')
    .description('pack items')
    .action((obj) => {
        console.log(123,obj)

        buildTools.init()
    })


program.parse(process.argv);