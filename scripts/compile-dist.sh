#!/bin/bash

cd ./src/b:instance/shared-memory/
node-gyp build                      # Compile C++ source (in-place)

cd ../../../
rm -rf ./dist/                      # Remove /dist directory to remove stale contents
tsc --outDir ./dist/                # Compile TypeScript source
cp ./src/help.txt ./dist/help.txt   # Copy help message text file
cp ./src/b:instance/shared-memory/build/Release/shared_memory.node ./dist/b:instance/shared-memory/shared-memory.node
                                    # Copy compilation of shared memory N-API module for access