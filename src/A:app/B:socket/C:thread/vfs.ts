
import { join } from "path";

import { PROJECT_PATH } from "../../path";
import { PROJECT_CONFIG } from "../../config/config.project";


const webPath: string = join(PROJECT_PATH, PROJECT_CONFIG.read("webDirectory").string);