"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReleaseURL = exports.downloadCLI = void 0;
const os = __importStar(require("os"));
const core = __importStar(require("@actions/core"));
const cache = __importStar(require("@actions/tool-cache"));
const exec = __importStar(require("@actions/exec"));
const semver = __importStar(require("semver"));
const path_1 = __importDefault(require("path"));
const toolNames = ['tailscale', 'tailscaled'];
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        // check os as we only support linux
        if (os.platform() !== 'linux') {
            core.setFailed('Only linux is currently supported.');
        }
        // get authkey
        let authkey;
        const client_id = core.getInput('client_id');
        const client_secret = core.getInput('client_secret');
        if (client_id && client_secret) {
            /* get a access token from client_id and client_secret
            curl -d "client_id=${client_id}" -d "client_secret=${client_secret}" \
             "https://api.tailscale.com/api/v2/oauth/token"
            */
            /* create a short lived access token for devices
            curl --location --request POST 'https://api.tailscale.com/api/v2/tailnet/-/keys' \
            --header 'Authorization: Bearer tskey-api-***' \
            --header 'Content-Type: application/json' \
            --data-raw '{
              "capabilities": {
                "devices": {
                  "create": {
                    "reusable": false,
                    "ephemeral": true,
                    "preauthorized": true,
                    "tags": [ "tag:github" ]
                  }
                }
              },
              "expirySeconds": 90
            }'
            */
            authkey = 'replace';
        }
        else {
            authkey = core.getInput('authkey');
        }
        try {
            const version = core.getInput('version');
            let tailscale;
            let tailscaled;
            // is this version already in our cache
            tailscale = cache.find(toolNames[0], version);
            tailscaled = cache.find(toolNames[1], version);
            // download if one is missing
            if (!tailscale || !tailscaled) {
                core.debug("downloading tailscale");
                const paths = yield downloadCLI(version);
                tailscale = paths[0];
                tailscaled = paths[1];
            }
            // add both to path for this and future actions to use
            core.addPath(tailscale);
            core.addPath(tailscaled);
            // start tailscaled
            yield exec.exec('tailscaled');
            const args = core.getInput('args');
            const final_args = ['up', '--authkey', authkey].concat(args.split(' '));
            // tailscale up??
            yield exec.exec('tailscale', final_args);
        }
        catch (error) {
            if (error instanceof Error)
                core.setFailed(error.message);
        }
    });
}
function getArch() {
    let val = os.arch();
    if (val === 'x64') {
        val = 'amd64';
    }
    return val;
}
function downloadCLI(version) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = getReleaseURL(version);
        core.debug(`downloading ${url}`);
        const artifactPath = yield cache.downloadTool(url);
        core.debug(`artifactPath: ${artifactPath}`);
        const dirPath = yield cache.extractTar(artifactPath);
        return Promise.all([
            cache.cacheFile(path_1.default.join(dirPath, toolNames[0]), toolNames[0], toolNames[0], version),
            cache.cacheFile(path_1.default.join(dirPath, toolNames[1]), toolNames[1], toolNames[1], version)
        ]);
    });
}
exports.downloadCLI = downloadCLI;
function getReleaseURL(version) {
    const cleanVersion = semver.clean(version) || '';
    const arch = getArch();
    const minor = semver.minor(cleanVersion);
    if (minor % 2 === 0) {
        return encodeURI(`https://pkgs.tailscale.com/stable/tailscale_${cleanVersion}_${arch}.tgz`);
    }
    return encodeURI(`https://pkgs.tailscale.com/unstable/tailscale_${cleanVersion}_${arch}.tgz`);
}
exports.getReleaseURL = getReleaseURL;
run();
