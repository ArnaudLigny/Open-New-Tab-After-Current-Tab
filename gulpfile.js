'use strict';

const extensionName = 'Open-New-Tab-After-Current-Tab';

const fs = require('fs');
const cleancss = require('gulp-clean-css');
const cleanhtml = require('gulp-cleanhtml');
const crx = require('gulp-crx-pack');
const del = require('del');
const gulp = require('gulp');
const log = require('fancy-log');
const vinylpaths = require('vinyl-paths');
const zip = require('gulp-zip');

// Clean build directory
gulp.task('clean', () => {
  return gulp.src('build/*')
    .pipe(vinylpaths(del));
});

// Copy and compress HTML files
gulp.task('html', () => {
  return gulp.src('src/*.html')
    .pipe(cleanhtml())
    .pipe(gulp.dest('build'));
});

// Copy scripts
gulp.task('scripts', () => {
  return gulp.src('src/*.js')
    .pipe(gulp.dest('build'));
});

// Copy and minify CSS
gulp.task('styles', () => {
  gulp.src('src/**/*.min.css')
    .pipe(gulp.dest('build'));
  return gulp.src(['src/*.css', '!src/vendor/**/*.css'])
    .pipe(cleancss({root: 'src', keepSpecialComments: 0}))
    .pipe(gulp.dest('build'));
});

// Copy static files
gulp.task('copy', () => {
  gulp.src('src/*.png')
    .pipe(gulp.dest('build'));
  gulp.src('src/*.mp3')
    .pipe(gulp.dest('build'));
  gulp.src('src/_locales/**')
    .pipe(gulp.dest('build/_locales'));
  return gulp.src('src/manifest.json')
    .pipe(gulp.dest('build'));
});

// Build
gulp.task('build', ['clean', 'html', 'scripts', 'styles', 'copy']);

// Build ditributable (ZIP)
gulp.task('zip', ['build'], () => {
  const manifest = require('./src/manifest.json');
  const distFileName = extensionName + '_v' + manifest.version + '.zip';
  return gulp.src(['build/**'])
    .pipe(zip(distFileName))
    .pipe(gulp.dest('dist'));
});

// Build distributable (CRX) extension
gulp.task('crx', ['build'], () => {
  const manifest = require('./src/manifest.json');
  const crxFileName = extensionName + '_v' + manifest.version + '.crx';
  fs.access('./certs/key', err => {
    if (err) {
      log.error(err.message);
      return err.code;
    }

    return gulp.src('build')
      .pipe(crx({
        privateKey: fs.readFileSync('./certs/key', 'utf8'),
        filename: crxFileName
      }))
      .pipe(gulp.dest('dist'));
  });
});

// Build distributable
gulp.task('dist', ['zip']);

// Run build task by default
gulp.task('default', ['clean'], () => {
  gulp.start('build');
});
