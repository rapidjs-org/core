const { execSync } = require("child_process");
const { join, extname } = require("path");
const { readdir, readFileSync, writeFileSync, rmSync } = require("fs");


const DIST_DIR_NAME = "dist";
const DIST_DIR_PATH = join(process.cwd(), DIST_DIR_NAME);
const SIGNATURE = String(readFileSync(join(__dirname, "../../../signature.txt")));
const START_TIME = Date.now();
const record = {
    fileCount: 0
};


try {
    rmSync(DIST_DIR_PATH, {
        force: true,
        recursive: true
    });
} catch {}


const cmd = command => {
    execSync(command, {
        cwd: join(__dirname, "../")
    });
};
//cmd(`node ./scripts/generate-typings.js`);
cmd(`npx tsc --outDir ${DIST_DIR_PATH} --removeComments`);
cmd(`./scripts/shm-gyp.sh build --release`);
cmd(`./scripts/shm-copy.sh ${DIST_DIR_NAME} Release`);
cmd(`./scripts/help-copy.sh ${DIST_DIR_NAME}`);

process.on("exit", () => {
    console.log(`\x1b[32mBuild process \x1b[1msucceeded\x1b[22m (${
        record.fileCount
    } files, ${
        Math.round((Date.now() - START_TIME) * 0.001)
    }s)\x1b[0m`);
});


function minify(path) {
    readdir(path, {
        withFileTypes: true
    }, (err, dirents) => {
        if(err) throw err;

        dirents.forEach(dirent => {
            const filePath = join(path, dirent.name);
            if(dirent.isDirectory(filePath)) {
                minify(filePath);
                return;
            }

            let contents = String(readFileSync(filePath));
            switch(extname(filePath).toLocaleLowerCase()) {
                case ".js":
                    contents = minifyJS(contents);
                    break;
            }
            writeFileSync(filePath, contents);

            record.fileCount++;
        });
    });
}

minify(DIST_DIR_PATH);

function minifyJS(contents) {
    const shebangRegex = /^#![^\n]*\n/;
    const shebangLine = (contents.match(shebangRegex) || [ "" ])[0];
    return `${shebangLine}/*\n${
        SIGNATURE.split(/\n/g)
        .map(str => ` * ${str.trim()}`)
        .join("\n")
    }\n */\n${contents
        .slice(shebangLine.length)
        .replace(/\n/g, "")
        .replace(/(\s)\s+/g, "$1")
        .trim()
    }`;
}