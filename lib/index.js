import Path from 'path'
import { assert } from 'console';
import childProcess from 'child_process'
import dayjs from 'dayjs'
import fse from 'fs-extra'
import iconv from 'iconv-lite'
import stripJsonComments from 'strip-json-comments';

const packageJSON = JSON.parse(await fse.readFile('package.json', 'utf8'))

class FileHandle {
    async read(filename) {
        return await fse.readFile(filename, 'utf8')
    }

    async write(path, content) {
        await fse.writeFile(path, content, { encoding: 'utf8' })
    }

    async readJobFile(filename) {
        const name = filename.slice(0, filename.indexOf('.'))
        const str = await this.read(filename)
        this.cache[name] = str
        this[name] = JSON.parse(stripJsonComments(str))

    }

    async writeJobFile(path, filename) {
        const name = filename.slice(0, filename.indexOf('.'))
        await this.write(Path.join(path), this.cache[name])
    }
}


export default class BuildTools extends FileHandle {
    constructor() {
        super()
        // 缓存初始数据
        this.cache = {}
        // manifest.json文件 供修改
        this.manifest = {}
        // build.json文件 供修改
        this.build = {}

        this.readFileList = ['manifest.json', 'build.json']

        this.ucptConfig = packageJSON.ucptConfig

        this.HBXCLI = null
    }
    async init(cliConfig) {
        this.ucptConfig = {
            ...this.ucptConfig,
            ...cliConfig
        }

        this.HBXCLI = Path.normalize(this.ucptConfig.HBXCLI)
        await this.readJobFile(this.readFileList[0])
        await this.readJobFile(this.readFileList[1])

        // console.log('manifestJSON', this.manifest)
        if(this.ucptConfig.type === 'local') {
            await this.localBuild()
        }else if(this.ucptConfig.type === 'h5') {
            this.publishDir = Path.join(this.ucptConfig.output || 'dist', `${dayjs().format('YYYYMMDD')}-${this.manifest.versionName}`)
            await fse.ensureDir(this.publishDir)
            await this.h5Build()
        } else {
            this.publishDir = Path.join(this.ucptConfig.output || 'dist', `${dayjs().format('YYYYMMDD')}-${this.manifest.versionName}`)
            await fse.ensureDir(this.publishDir)
            await this.cloudBuild()
        }
        

    }

    async localBuild() {
        const cli = `${this.HBXCLI} publish --platform APP --type appResource --project ${Path.basename(process.env.INIT_CWD)}`
        console.log('app资源包执行命令', cli)

        const outputDir = Path.resolve(this.ucptConfig.localOutput)

        await fse.remove(outputDir)

        await this.cmdRun(cli)

        console.log(outputDir)
        await fse.copy('unpackage/resources', outputDir)

        console.log('app资源包打包完成 nice')
    }

    async cloudBuild() {
        assert('没有配置打包列表---请检查config.buildList', this.ucptConfig.buildList.length)
        this.loopWorkTask(0)
    }

    async h5Build() {
        const cli = `${this.HBXCLI} publish --platform h5 --project ${Path.basename(process.env.INIT_CWD)} --webTitle ${this.manifest.name}`
        console.log('h5执行命令：', cli)
        await this.cmdRun(cli)

        const outputDir = Path.join(this.publishDir, 'h5')

        await fse.ensureDir(outputDir)

        await fse.copy('unpackage/dist/build/h5', outputDir)

        console.log('h5打包完成 nice')
    }

    async loopWorkTask(index) {
        const param = this.ucptConfig.buildList[index]
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

            await this.write(this.readFileList[0], JSON.stringify(this.manifest))
            await this.write(this.readFileList[1], JSON.stringify(this.build))

            await fse.ensureDir(saveDir)

            // 记录当前时间
            const time = dayjs().valueOf()

            // 打包
            await this.packAPK()

            // 过滤小于打包时间的文件
            const dirs = await (await fse.readdir('unpackage/release/apk/'))
            const result = await Promise.all(dirs.map(async filename => {
                const info = await fse.stat(Path.join('unpackage/release/apk/', filename))
                return dayjs(info.mtime).valueOf() > time
            }))
            const filters = dirs.filter((_v, index) => result[index])

            console.log('可移动文件：', filters)

            // 复制到输出目录
            await Promise.all(filters.map(async filename => {
                await fse.move(Path.join('unpackage/release/apk/', filename), Path.join(saveDir, filename))
            }))

            this.loopWorkTask(index + 1)
        } else {
            // 文件还原
            await this.writeJobFile(this.readFileList[0], this.readFileList[0])
            await this.writeJobFile(this.readFileList[1], this.readFileList[1])
            console.log('打包完成 nice')
        }
    }



    async packAPK() {
        const path = Path.resolve(Path.resolve(), this.readFileList[1])
        console.log(this.HBXCLI, path)
        await this.cmdRun(`${this.HBXCLI} pack --config ${path}`)
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
