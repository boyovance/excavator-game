const { app } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

const userFile = (name) => path.join(app.getPath('userData'), name);
const importLocal = (...parts) => import(pathToFileURL(path.join(__dirname, '..', ...parts)).href);

module.exports = { userFile, importLocal };
