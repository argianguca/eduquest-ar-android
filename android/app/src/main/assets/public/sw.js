/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "90fc3018146cfa1722d894147b6cac3b"
  }, {
    "url": "pwa-512x512.png",
    "revision": "90fc3018146cfa1722d894147b6cac3b"
  }, {
    "url": "pwa-192x192.png",
    "revision": "2472a4806ea9327c3ca2e7e803cac680"
  }, {
    "url": "index.html",
    "revision": "178e5967448316610c405ea010a1f34b"
  }, {
    "url": "icon.svg",
    "revision": "f90e7f054246625fbc255d0237164fa1"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "0d3b81e78f16d1fdff0c4e4b92dc5778"
  }, {
    "url": "wasm/vision_wasm_nosimd_internal.wasm",
    "revision": "a17c20a695d6b9d42c3a5bcf98abdda6"
  }, {
    "url": "wasm/vision_wasm_nosimd_internal.js",
    "revision": "684d0886b32f1ecca2c2282549f60f33"
  }, {
    "url": "wasm/vision_wasm_module_internal.wasm",
    "revision": "14c07c097e0f9db1d170eb94aaec19aa"
  }, {
    "url": "wasm/vision_wasm_module_internal.js",
    "revision": "5863d2f943fee28f3ebfcbb4e9ca683d"
  }, {
    "url": "wasm/vision_wasm_internal.wasm",
    "revision": "25f5d5fad92e2fbf5b3fd663e7b6e815"
  }, {
    "url": "wasm/vision_wasm_internal.js",
    "revision": "fa324fb5a32a24e691b35b7e1df46dd3"
  }, {
    "url": "models/pose_landmarker_lite.task",
    "revision": "04a75ddf7c811ac7a1a4523266dd7d88"
  }, {
    "url": "models/hand_landmarker.task",
    "revision": "15318430ea3851670fe9914116a9cfad"
  }, {
    "url": "assets/index-TrJNffui.css",
    "revision": null
  }, {
    "url": "assets/index-Ce46KAA8.js",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "0d3b81e78f16d1fdff0c4e4b92dc5778"
  }, {
    "url": "icon.svg",
    "revision": "f90e7f054246625fbc255d0237164fa1"
  }, {
    "url": "pwa-192x192.png",
    "revision": "2472a4806ea9327c3ca2e7e803cac680"
  }, {
    "url": "pwa-512x512.png",
    "revision": "90fc3018146cfa1722d894147b6cac3b"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "90fc3018146cfa1722d894147b6cac3b"
  }, {
    "url": "models/hand_landmarker.task",
    "revision": "15318430ea3851670fe9914116a9cfad"
  }, {
    "url": "models/pose_landmarker_lite.task",
    "revision": "04a75ddf7c811ac7a1a4523266dd7d88"
  }, {
    "url": "wasm/vision_wasm_internal.js",
    "revision": "fa324fb5a32a24e691b35b7e1df46dd3"
  }, {
    "url": "wasm/vision_wasm_internal.wasm",
    "revision": "25f5d5fad92e2fbf5b3fd663e7b6e815"
  }, {
    "url": "wasm/vision_wasm_module_internal.js",
    "revision": "5863d2f943fee28f3ebfcbb4e9ca683d"
  }, {
    "url": "wasm/vision_wasm_module_internal.wasm",
    "revision": "14c07c097e0f9db1d170eb94aaec19aa"
  }, {
    "url": "wasm/vision_wasm_nosimd_internal.js",
    "revision": "684d0886b32f1ecca2c2282549f60f33"
  }, {
    "url": "wasm/vision_wasm_nosimd_internal.wasm",
    "revision": "a17c20a695d6b9d42c3a5bcf98abdda6"
  }, {
    "url": "manifest.webmanifest",
    "revision": "9fe8fdb8190548884173ff35b714e30e"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/cdn\.jsdelivr\.net\/npm\/@mediapipe\/tasks-vision@latest\/wasm\/.*/i, new workbox.CacheFirst({
    "cacheName": "mediapipe-wasm-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 20,
      maxAgeSeconds: 15552000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/storage\.googleapis\.com\/mediapipe-models\/.*/i, new workbox.CacheFirst({
    "cacheName": "mediapipe-models-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 15552000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
