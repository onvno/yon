const path = require('path');
const utility = require('utility');
const utils = require('./utils');
const fs = require('mz/fs');
const chalk = require('chalk');
const npa = require('npm-package-arg');
const installLocal = require('./local_install');
const formatInstallOptions = require('./format_install_options');

module.exports = function* globalInstall(options) {
    const pkgs = options.pkgs || [];
    const globalTargetDir = options.targetDir;
    const globalBinDir = options.binDir;
    options.pkgs = [];
    options.targetDir = null;
    options.binDir = null;

    const opts = Object.assign({}, options);
    for (const pkg of pkgs) {
        let name = pkg.name;
        // 此处待处理，没有传递version
        if(!name) {
            name = utility.md5(pkg.verison)
        }

        // 使用过npminstall,兼容删除之前存储文件
        const oldStoreDir = path.join(globalTargetDir, 'node_modules', `.${name}_npminstall/node_modules`);
        yield utils.rimraf(oldStoreDir);

        const tmpDir = path.join(globalTargetDir, `node_modules/${name}_tmp`);
        yield utils.rimraf(tmpDir);

        const installOptions = formatInstallOptions(Object.assign({}, opts, {
            storeDir: tmpDir,
            cache: {},
        }));

    }




}
