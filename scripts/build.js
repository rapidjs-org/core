// TODO: To GitHub as remote dependency?

const { join } = require("path");
const { readFileSync, readdirSync, writeFileSync } = require("fs");


const signature = String(readFileSync(join(__dirname, "./signature.txt")));


buildDir(join(__dirname, "../dist/"));

console.log(`\n\x1b[2m• Distributable built with \x1b[0m\x1b[32msuccess\x1b[2m.\x1b[0m\n`);


function buildDir(path) {
    readdirSync(path, {
        withFileTypes: true
    })
    .forEach(dirent => {
        const subPath = join(path, dirent.name);

        if(dirent.isDirectory()) {
            buildDir(subPath);

            return;
        }
        
        writeFileSync(subPath, `${signature}\n${String(readFileSync(subPath))}`);
    });
}