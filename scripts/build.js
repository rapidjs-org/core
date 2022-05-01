
const { join } = require("path");
const { readdir, readFileSync, writeFileSync } = require("fs");


let buildDirPath = process.argv.slice(2)[0];
if(!buildDirPath) {
    throw new SyntaxError("Specify path to build directory");
}
buildDirPath = (buildDirPath.charAt(0) != "/")
? join(process.cwd(), buildDirPath)
: buildDirPath;

const CODE_SIGNATURE = readFileSync(join(__dirname, "./code-signature"));

let count = {
    dir: 0,
    file: 0
};


process.on("exit", _ => {
    console.log(`Build successful (${count.file} files in ${count.dir} directories).`);
});

// TODO: Copy method signature (JSDoc) comments from source to keep IDE info


function buildDirectory(dirPath) {
    readdir(dirPath, {
        withFileTypes: true
    }, (_, dirents) => {
        (dirents || []).forEach(dirent => {
            const curFilePath = join(dirPath, dirent.name);

            if(dirent.isDirectory()) {
                buildDirectory(curFilePath);
                count.dir++;

                return;
            }

            writeFileSync(curFilePath, `${CODE_SIGNATURE}\n\n${readFileSync(curFilePath)}`);
            count.file++;
        });
    });
}

buildDirectory(buildDirPath);