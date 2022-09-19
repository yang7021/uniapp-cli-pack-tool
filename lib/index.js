import Path from 'path'
import { assert } from 'console';
import childProcess from 'child_process'
import dayjs from 'dayjs'
import fse from 'fs-extra'
import iconv from 'iconv-lite'
import stripJsonComments from 'strip-json-comments';

class FileHandle {
    async readFile(filename) {
        const name = filename.slice(0, filename.indexOf('.'))
        const str = await fse.readFile(`${this.config.buildItemDir}${filename}`, 'utf8')
        this.cache[name] = str
        this[name] = JSON.parse(stripJsonComments(str))
    }
    async setFile(path, content) {
        await fse.writeFile(path, content, { encoding: 'utf8' })
    }
}


export class BuildTools extends FileHandle {
    constructor(data) {
        super()
        this.config = data
        // 缓存初始数据
        this.cache = {}
        // manifest.json文件 供修改
        this.manifest = {}
        // build.json文件 供修改
        this.build = {}
    }
    async init() {
        const readList = ['manifest.json', 'build.json']
        await this.readFile(readList[0])
        await this.readFile(readList[1])

        this.publishDir = `${this.config.publishDir}${dayjs().format('YYYYMMDD')}-${this.manifest.versionName}`
        await fse.ensureDir(this.publishDir)

        assert('没有配置打包列表---请检查config.piblishConfig', this.config.piblishConfig.length)

        const asyncLoop = async (list, index) => {
            const param = list[index]
            if (param) {
                this.manifest.name = param.name
                this.build.android.channels = param.channels

                let saveDir = ''

                // 32位 64位
                if (param.abiFilters) {
                    saveDir = this.publishDir + `/${param.name}/x32`
                    this.manifest['app-plus'].distribute.android.abiFilters = [param.abiFilters]
                } else {
                    saveDir = this.publishDir + `/${param.name}/x64`
                }

                await this.setFile(`${this.config.buildItemDir}${readList[0]}`, JSON.stringify(this.manifest))
                await this.setFile(`${this.config.buildItemDir}${readList[1]}`, JSON.stringify(this.build))

                await fse.ensureDir(saveDir)

                // 记录当前时间
                const time = dayjs().valueOf()

                // 打包
                await this.packAPK()

                // 过滤小于打包时间的文件
                const dirs = await (await fse.readdir(this.config.buildUnpackageDir))
                const result = await Promise.all(dirs.map(async filename => {
                    const info = await fse.stat(Path.join(this.config.buildUnpackageDir, filename))
                    return dayjs(info.mtime).valueOf() > time
                }))
                const filters = dirs.filter((_v, index) => result[index])

                console.log('可移动文件：', filters)

                // 复制到输出目录
                await Promise.all(filters.map(async filename => {
                    await fse.move(Path.join(this.config.buildUnpackageDir, filename), Path.join(saveDir, filename))
                }))

                await asyncLoop(list, index + 1)
            }
        }
        await asyncLoop(this.config.piblishConfig, 0)

        // 文件还原
        await this.saveFile(`${this.config.buildItemDir}${readList[0]}`, readList[0])
        await this.saveFile(`${this.config.buildItemDir}${readList[1]}`, readList[1])

        console.log('打包完成 nice')
    }

    async saveFile(path, filename) {
        const name = filename.slice(0, filename.indexOf('.'))
        await this.setFile(Path.join(path), this.cache[name])
    }

    async packAPK() {
        const path = Path.normalize(`${this.config.buildItemDir}build.json`)
        const cmd = Path.normalize(this.config.cliExe)
        console.log(cmd, path)
        await this.cmdRun(`${cmd} pack --config ${path}`)
    }
    cmdRun(script) {
        const encoding = 'cp936';
        const binaryEncoding = 'binary';
        return new Promise((resolve, reject) => {
            const childProce = childProcess.exec(script, { encoding: binaryEncoding }, (error, stdout, stderr) => {
                if (error) {
                    console.log('报错了请排查问题,日志:')
                    console.log(stdout)
                    console.log('stderr:', stderr)
                    process.exit(1)
                } else {
                    resolve()
                }
            })
            childProce.stdout.on('data', function (data) {
                // 修复乱码问题
                console.log(iconv.decode(Buffer.from(data, binaryEncoding), encoding));
            })
        })
    }
}
