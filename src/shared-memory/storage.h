#pragma once
#ifndef STORAGE_H
#define STORAGE_H
#endif


namespace Storage {
    
    char write(const uint32_t* app_key, const std::string purpose_key, const uint8_t* buffer, const size_t buffer_size);
    
    uint8_t* read(const uint32_t* app_key, const std::string purpose_key);

    void free();
    
}