//#include "shared-memory.h"

#include <napi.h>


// SEM
// TODO: Mem space ID


Napi::String Method(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env();
	return Napi::String::New(env, "TEST");
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
	exports.Set(Napi::String::New(env, "test"),
			Napi::Function::New(env, Method));
	return exports;
}

NODE_API_MODULE(shared_memory, Init)