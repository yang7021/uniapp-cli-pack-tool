import {BuildTools} from './lib/index.js'
import config from './config/config.js'

const buildTools = new BuildTools(config)

buildTools.init()

