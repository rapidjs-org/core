#include <string>
#include <set>
#include <map>

#include <stdint.h>
#include <semaphore.h>
#include <sys/shm.h>

#include "./storage.h"


struct AttachedInfo {
    void* segment;
    uint32_t unique_key;
};


sem_t* sem;
std::map<std::string, AttachedInfo> attached_info;


template<typename T>
T close_with_failure(char code) {
    sem_post(sem);
    
    return (T)(code);
}

// Simple polynomial rolling hash
// Addition to app key
uint32_t compute_unique_key(const uint32_t* app_key, std::string purpose_key) {
    if(attached_info.count(purpose_key)) {
        return attached_info[purpose_key].unique_key;
    }
    
    const int p = 128;
    const int m = 1e9 + 9;

    uint32_t hash_key = 0;
    uint32_t p_pow = 1;

    for (char c : purpose_key) {
        hash_key = (hash_key + (c + 1) * p_pow) % m;
        p_pow = (p_pow * p) % m;
    }

    uint32_t unique_key = hash_key + *app_key;

    attached_info[purpose_key] = {
        NULL, unique_key
    };

    return unique_key;
}

void* attach_segment(const std::string purpose_key, int shm_id) {
    void* segment = (uint8_t*)shmat(shm_id, NULL, 0);

    attached_info[purpose_key].segment = segment;

    return segment;
}


char Storage::write(const uint32_t* app_key, const std::string purpose_key, const uint8_t* buffer, const size_t buffer_size) {
    uint32_t unique_key = compute_unique_key(app_key, purpose_key);

    sem = sem_open((char*)(unique_key), O_CREAT, 0644, 0);  // TODO: Use write type signals to abort on similar write occurrences?

    int shm_id = shmget(unique_key, buffer_size + (size_t)sizeof(size_t), IPC_CREAT | 0644);    // TODO: Collision strategy (occpuancy)
    if(shm_id == -1) {
        return close_with_failure<char>(-1);
    }

    void* segment = attach_segment(purpose_key, shm_id);
    uint8_t* segment_uint8 = (uint8_t*)segment;
    if(segment_uint8 == (uint8_t*)-1) {
        return close_with_failure<char>(-1);
    }

    *(size_t*)segment = buffer_size;
    segment_uint8 += sizeof(size_t);
    for(size_t i = 0; i < buffer_size; i++) {
        *segment_uint8++ = buffer[i];
    }

    sem_post(sem);

    return 0;
}

uint8_t* Storage::read(const uint32_t* app_key, std::string purpose_key) {
    uint32_t unique_key = compute_unique_key(app_key, purpose_key);

    sem = sem_open((char*)(unique_key), O_CREAT, 0644, 0);

	int shm_id = shmget(unique_key, 0, 0 | 0644);
    if(shm_id == -1) {
        return close_with_failure<uint8_t*>((errno == 2) ? -2 : -1);    // Not found: -2
    }

    uint8_t* buffer = (uint8_t*)attach_segment(purpose_key, shm_id);
    if(buffer == (uint8_t*)-1) {
        return close_with_failure<uint8_t*>(-1);
    }
    
    sem_post(sem);

    return buffer;
}

void Storage::free() {
    for(std::pair<std::string, AttachedInfo> info : attached_info) {
        sem = sem_open((char*)(info.second.unique_key), O_CREAT, 0644, 0);
        
        shmdt(info.second.segment);

	    int shm_id = shmget(info.second.unique_key, 0, 0 | 0644);
        if(shm_id == -1) {
            sem_post(sem);

            continue;
        }

        shmctl(shm_id, IPC_RMID, NULL);

        struct shmid_ds* buf;
        
        sem_post(sem);
    }
}   // TODO: Keep alive on erroneous terminations (global free?)