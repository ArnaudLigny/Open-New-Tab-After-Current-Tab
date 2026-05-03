import {createRequire} from 'node:module';
import {src, dest, series} from 'gulp';
import {deleteAsync} from 'del';
import zip from 'gulp-zip';

const require = createRequire(import.meta.url);
const extensionName = 'Open-New-Tab-After-Current-Tab';

async function clean() {
  await deleteAsync(['build']);
}

function buildTask() {
  return src('src/**', {encoding: false})
    .pipe(dest('build'));
}

function distTask() {
  const manifest = require('./src/manifest.json');
  const distFileName = extensionName + '_v' + manifest.version + '.zip';
  return src('build/**', {encoding: false})
    .pipe(zip(distFileName))
    .pipe(dest('dist'));
}

export {clean};
export const build = series(clean, buildTask);
export const dist = series(clean, buildTask, distTask);
export default series(clean, buildTask, distTask);
