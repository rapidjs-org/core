{
    "targets": [
        {
            "target_name": "shared_memory",
            "cflags!": [ "-fno-exceptions -lpthread" ],
            "cflags_cc!": [ "-fno-exceptions" ],
            "sources": [ "EMemoryAccess.h", "storage.h", "shared-memory.cpp", "storage.cpp" ],
            "include_dirs": [
                "<!@(node -p \"require('node-addon-api').include\")"
            ],
            'defines': [ 'NAPI_DISABLE_CPP_EXCEPTIONS' ]
        }
    ]
}