
const { readdir } = require("fs");
const { join } = require("path");


const buildDir = process.argv.slice(2)[0];


function scanTestDi
readdir(path, {
    withFileTypes: true
}, (_, dirents) => {
    (dirents || []).forEach(dirent => {
        const curPath = join(path, dirent.name);

        if(dirent.isDirectory()) {
            // Scan sub directory
            return scanDir(curPath, callback, recursive);
        }

        checkFile(curPath, callback)
            .catch(_ => {
                throw true;
            });
    });
});