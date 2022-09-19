export default {
    cliExe: '`D:/HBuilderX/cli.exe HBuilderX根目录的cli.exe位置`',
    buildItemDir: '`D:/项目 项目根目录/`',
    buildUnpackageDir: '`D:/项目/unpackage/release/apk/ app生成的目录`',
    publishDir: '`D:/app_update_dirs/ app输入目录`', 
    piblishConfig:[
        {
            name: '应用名a,打32位包', // 应用名
            channels: 'common,yyb,360,huawei,xiaomi,oppo,vivo' // 渠道
        },
        {
            abiFilters: 'armeabi-v7a', // 需要32位包才设置
            name: '应用名b,打32位包',
            channels: 'yyb'
        }
    ]
}