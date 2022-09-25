//#include "shared-memory.h"

#include <string>

#include <napi.h>
#include <node_buffer.h>

#include "./storage.h"


// TODO: Adopt on windows


uint32_t app_key;


void init(const Napi::CallbackInfo& args) {
	// APP KEY
	app_key = args[0].ToNumber().Uint32Value();
}

void write(const Napi::CallbackInfo& args) {
	std::string purpose_key = args[0].ToString().Utf8Value();

	const Napi::Uint8Array buffer_array = args[1].As<Napi::Uint8Array>();
    const size_t length = buffer_array.ElementLength();
    const uint8_t* buffer = buffer_array.Data();

	const char state = Storage::write(&app_key, purpose_key, buffer, length);

	if(state != -1) {
		return;
	}

    Napi::Env env = args.Env();
    Napi::RangeError::New(env, "Could not access shared memory segment (w)").ThrowAsJavaScriptException();
}	// TODO: Interfaces for manipulation (type wise)?

Napi::Buffer<uint8_t> read(const Napi::CallbackInfo& args) {
	Napi::Env env = args.Env();

	std::string purpose_key = args[0].ToString().Utf8Value();
	
	void* buffer = Storage::read(&app_key, purpose_key);
	uint8_t* buffer_uint8 = (uint8_t*)buffer;

	if(buffer_uint8 == (uint8_t*)-1) {
		Napi::RangeError::New(env, "Could not access shared memory segment (r)").ThrowAsJavaScriptException();
		
		return Napi::Buffer<uint8_t>::New(env, NULL, 0);
	} else if(buffer_uint8 == (uint8_t*)-2) {
		return Napi::Buffer<uint8_t>::New(env, NULL, 0);
	}
	
	size_t length = *(size_t*)buffer;
	buffer_uint8 += sizeof(size_t);

	return Napi::Buffer<uint8_t>::New(env, buffer_uint8, length);
}

void free_memory(const Napi::CallbackInfo& args) {
	Storage::free();
}


Napi::Object bind(Napi::Env env, Napi::Object exports) {
	exports.Set(Napi::String::New(env, "init"), Napi::Function::New(env, init));
	exports.Set(Napi::String::New(env, "write"), Napi::Function::New(env, write));
	exports.Set(Napi::String::New(env, "read"), Napi::Function::New(env, read));
	exports.Set(Napi::String::New(env, "free"), Napi::Function::New(env, free_memory));

	return exports;
}


NODE_API_MODULE(shared_memory, bind);