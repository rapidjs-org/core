const { writeFileSync, readFileSync } = require("fs");
const { join } = require("path");


const tmpFile = "test.txt";
const tmpFilePath = join(__dirname, "../.tmp", tmpFile);

const fileContents = {
    initial: "foo",
    eventual: "bar"
}


const { VFS } = require("../../debug/b:instance/c:thread/memory/VFS");

const testVFS = new VFS("./");


assert("Check if non-existing file exists", testVFS.exists(tmpFile), false);

writeFileSync(tmpFilePath, fileContents.initial);

assert("Check if existing file exists on disc", testVFS.exists(tmpFile), true);

assert("Read existing file contents from VFS", testVFS.read(tmpFile).data, fileContents.initial);

testVFS.writeVirtual(tmpFile, fileContents.eventual);

assert("Read virtually modified file contents from VFS", testVFS.read(tmpFile).data, fileContents.eventual);

assert("Verify persistent file contents from disc (fs module)", String(readFileSync(tmpFilePath)), fileContents.initial);

testVFS.writeDisc(tmpFile, fileContents.eventual);

assert("Read disc modified file contents from VFS", testVFS.read(tmpFile).data, fileContents.eventual);

assert("Verify persistent file contents from disc (fs module)", String(readFileSync(tmpFilePath)), fileContents.eventual);