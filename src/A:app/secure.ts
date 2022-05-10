
import { PROJECT_CONFIG } from "./config/config.project";


// Construct absolute path from call point if relative path given
export const IS_SECURE = !!PROJECT_CONFIG.read("port", "https").number;