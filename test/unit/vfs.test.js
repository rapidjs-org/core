const { writeFileSync, readFileSync } = require("fs");
const { join } = require("path");

const tmpFile = "test.txt";
const tmpFilePath = join(__dirname, "../.tmp", tmpFile);

const fileContents = {
    initial: "foo",
    eventual: "bar"
}


const { VFS } = require("../../debug/storage/VFS");

const pivot = new VFS("./");


assert("Check if non-existing file exists", pivot.exists(tmpFile), false);

writeFileSync(tmpFilePath, fileContents.initial);

assert("Check if existing file exists on disc", pivot.exists(tmpFile), true);

assert("Read existing file contents from VFS", pivot.read(tmpFile).data, fileContents.initial);

pivot.writeVirtual(tmpFile, fileContents.eventual);

assert("Read virtually modified file contents from VFS", pivot.read(tmpFile).data, fileContents.eventual);

assert("Verify persistent file contents from disc (fs module)", String(readFileSync(tmpFilePath)), fileContents.initial);

pivot.writeDisc(tmpFile, fileContents.eventual);

assert("Read disc modified file contents from VFS", pivot.read(tmpFile).data, fileContents.eventual);

assert("Verify persistent file contents from disc (fs module)", String(readFileSync(tmpFilePath)), fileContents.eventual);