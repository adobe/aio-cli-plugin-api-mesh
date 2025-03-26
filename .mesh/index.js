"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscribe = exports.execute = exports.getBuiltMesh = exports.createBuiltMeshHTTPHandler = exports.getMeshOptions = exports.rawServeConfig = void 0;
var utils_1 = require("@graphql-mesh/utils");
var utils_2 = require("@graphql-mesh/utils");
var cache_localforage_1 = __importDefault(require("@graphql-mesh/cache-localforage"));
var fetch_1 = require("@whatwg-node/fetch");
var graphql_1 = __importDefault(require("@graphql-mesh/graphql"));
var plugin_http_details_extensions_1 = __importDefault(require("../src/plugins/httpDetailsExtensions"));
var merger_bare_1 = __importDefault(require("@graphql-mesh/merger-bare"));
var http_1 = require("@graphql-mesh/http");
var runtime_1 = require("@graphql-mesh/runtime");
var store_1 = require("@graphql-mesh/store");
var cross_helpers_1 = require("@graphql-mesh/cross-helpers");
var importedModule$0 = __importStar(require("./sources/AdobeCommerceAPI/introspectionSchema"));
var baseDir = cross_helpers_1.path.join(typeof __dirname === 'string' ? __dirname : '/', '..');
var importFn = function (moduleId) {
    var relativeModuleId = (cross_helpers_1.path.isAbsolute(moduleId) ? cross_helpers_1.path.relative(baseDir, moduleId) : moduleId).split('\\').join('/').replace(baseDir + '/', '');
    switch (relativeModuleId) {
        case ".mesh/sources/AdobeCommerceAPI/introspectionSchema":
            return Promise.resolve(importedModule$0);
        default:
            return Promise.reject(new Error("Cannot find module '".concat(relativeModuleId, "'.")));
    }
};
var rootStore = new store_1.MeshStore('.mesh', new store_1.FsStoreStorageAdapter({
    cwd: baseDir,
    importFn: importFn,
    fileType: "ts",
}), {
    readonly: true,
    validate: false
});
exports.rawServeConfig = undefined;
function getMeshOptions() {
    return __awaiter(this, void 0, Promise, function () {
        var pubsub, sourcesStore, logger, cache, sources, transforms, additionalEnvelopPlugins, adobeCommerceApiTransforms, additionalTypeDefs, adobeCommerceApiHandler, _a, _b, additionalResolvers, merger;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    pubsub = new utils_1.PubSub();
                    sourcesStore = rootStore.child('sources');
                    logger = new utils_2.DefaultLogger("🕸️  Mesh");
                    cache = new cache_localforage_1.default(__assign(__assign({}, {}), { importFn: importFn, store: rootStore.child('cache'), pubsub: pubsub, logger: logger }));
                    sources = [];
                    transforms = [];
                    additionalEnvelopPlugins = [];
                    adobeCommerceApiTransforms = [];
                    additionalTypeDefs = [];
                    adobeCommerceApiHandler = new graphql_1.default({
                        name: "AdobeCommerceAPI",
                        config: { "endpoint": "https://venia.magento.com/graphql" },
                        baseDir: baseDir,
                        cache: cache,
                        pubsub: pubsub,
                        store: sourcesStore.child("AdobeCommerceAPI"),
                        logger: logger.child("AdobeCommerceAPI"),
                        importFn: importFn,
                    });
                    sources[0] = {
                        name: 'AdobeCommerceAPI',
                        handler: adobeCommerceApiHandler,
                        transforms: adobeCommerceApiTransforms
                    };
                    _a = additionalEnvelopPlugins;
                    _b = 0;
                    return [4 /*yield*/, (0, plugin_http_details_extensions_1.default)(__assign(__assign({}, ({})), { logger: logger.child("httpDetailsExtensions"), cache: cache, pubsub: pubsub, baseDir: baseDir, importFn: importFn }))];
                case 1:
                    _a[_b] = _c.sent();
                    additionalResolvers = [];
                    merger = new merger_bare_1.default({
                        cache: cache,
                        pubsub: pubsub,
                        logger: logger.child('bareMerger'),
                        store: rootStore.child('bareMerger')
                    });
                    return [2 /*return*/, {
                            sources: sources,
                            transforms: transforms,
                            additionalTypeDefs: additionalTypeDefs,
                            additionalResolvers: additionalResolvers,
                            cache: cache,
                            pubsub: pubsub,
                            merger: merger,
                            logger: logger,
                            additionalEnvelopPlugins: additionalEnvelopPlugins,
                            get documents() {
                                return [];
                            },
                            fetchFn: fetch_1.fetch,
                        }];
            }
        });
    });
}
exports.getMeshOptions = getMeshOptions;
function createBuiltMeshHTTPHandler() {
    return (0, http_1.createMeshHTTPHandler)({
        baseDir: baseDir,
        getBuiltMesh: getBuiltMesh,
        rawServeConfig: undefined,
    });
}
exports.createBuiltMeshHTTPHandler = createBuiltMeshHTTPHandler;
var meshInstance$;
function getBuiltMesh() {
    if (meshInstance$ == null) {
        meshInstance$ = getMeshOptions().then(function (meshOptions) { return (0, runtime_1.getMesh)(meshOptions); }).then(function (mesh) {
            var id = mesh.pubsub.subscribe('destroy', function () {
                meshInstance$ = undefined;
                mesh.pubsub.unsubscribe(id);
            });
            return mesh;
        });
    }
    return meshInstance$;
}
exports.getBuiltMesh = getBuiltMesh;
var execute = function () {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    return getBuiltMesh().then(function (_a) {
        var execute = _a.execute;
        return execute.apply(void 0, args);
    });
};
exports.execute = execute;
var subscribe = function () {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    return getBuiltMesh().then(function (_a) {
        var subscribe = _a.subscribe;
        return subscribe.apply(void 0, args);
    });
};
exports.subscribe = subscribe;
