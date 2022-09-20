# uniapp-cli-pack-tool
uniapp打包工具帮你自动完成多个应用名的安卓打包


## 运行
需要了解[HBuilderX cli命令行工具](https://hx.dcloud.net.cn/cli/pack?id=config),以及把配置文件写好并能成功打包
默认读取`build.json`文件

```sh
# 1. 安装依赖
npm i

# 2. 修改package.json，根节点添加HBXCLI和buildConfig
"HBXCLI": "D:/HBuilderX/cli.exe",
"buildConfig":[
    {
        "name": "应用名a,打32位包",
        "channels": "common,yyb,360,huawei,xiaomi,oppo,vivo"
    },
    {
        "abiFilters": "armeabi-v7a", # 打32位包
        "name": "应用名b,打32位包",   # 应用名
        "channels": "yyb"            # 渠道包
    }
]

# 3. 运行
npx ucpt run
```


## 一、解决的问题
每次发版安卓需要打不同应用名的包发布到不同的应用商店, 应用宝还需要32位64位包。

如果发版都使用手动打包，每次更改应用名都需要手动提交云打包，等待打包完成，再修改应用名打包重复操作，有点太浪费自己时间了（发了快十个版本才想起做个工具--、）


## 二、目录结构

```
|-- 根目录
    |-- config
    |    |-- lib
    |        |-- index.js # 核心文件
```


## 三、运行逻辑

1. 读取 `manifest.json`, `build.json`, 设置缓存，创建目录
2. 修改 `manifest.json`
        - name
        - 32位、64位

- 修改 `build.json`
    - 需要打的渠道包

3. 运行 uniapp 命令行打包

4. 打包成功后，将打包文件移动到输出文件

5. 循环 2，3，4

6. `manifest.json`, `build.json`还原

## 四、生成的目录结构

```
|-- 默认dist
    |-- 年月日-版本号
    |    |-- 应用名a
    |        |-- x64
    |            |-- xxx.apk
    |            |-- xxx.apk
    |            |-- xxx.apk
    |        |-- x32
    |            |-- xxx.apk
    |            |-- xxx.apk
    |            |-- xxx.apk
    |    |-- 应用名b
    |        |-- x64
    |            |-- xxx.apk
    |            |-- xxx.apk
    |            |-- xxx.apk
    |        |-- x32
    |            |-- xxx.apk
    |            |-- xxx.apk
    |            |-- xxx.apk
```



## 问题
中间取消打包或者打包出错，`manifest.json`, `build.json`不会自动复原，使用前请让git的工作区为空
