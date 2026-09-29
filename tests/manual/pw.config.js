const base = require("../../playwright.config.js");
module.exports = { ...base, testDir: ".", testMatch: /.*\.check\.js/, webServer: { ...base.webServer, command: "python3 -m http.server 4173 --directory ../../app" } };
