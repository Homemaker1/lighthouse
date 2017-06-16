/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const del = require('del');
const gulp = require('gulp');
const gulpLoadPlugins = require('gulp-load-plugins');
const runSequence = require('run-sequence');
const browserify = require('browserify');
const ghpages = require('gh-pages');
const source = require('vinyl-source-stream');
const streamqueue = require('streamqueue');
const vinylBuffer = require('vinyl-buffer');

// Use uglify-es to get ES6 support.
const uglifyEs = require('uglify-es');
const composer = require('gulp-uglify/composer');
const uglify = composer(uglifyEs, console);

const ReportGenerator = require('../lighthouse-core/report/v2/report-generator.js');

const $ = gulpLoadPlugins();

function license() {
  return $.license('Apache', {
    organization: 'Google Inc. All rights reserved.',
  });
}

/**
 * Create a vinyl buffer stream from the given string. Supports optional fake
 * filename for vinyl object.
 * @param {string} content
 * @param {string} fakeFileName
 * @return {!Stream}
 */
function streamFromString(content, fakeFilename = 'fake.file') {
  const stream = source(fakeFilename);
  stream.end(content);
  return stream.pipe(vinylBuffer());
}

gulp.task('lint', () => {
  return gulp.src([
    'app/src/**/*.js',
    'gulpfile.js',
    'sw.js'
  ])
  .pipe($.eslint())
  .pipe($.eslint.format())
  .pipe($.eslint.failAfterError());
});

gulp.task('images', () => {
  return gulp.src('app/images/**/*')
  .pipe(gulp.dest(`dist/images`));
});

gulp.task('concat-css', () => {
  const reportCss = streamFromString(ReportGenerator.reportCss, 'report-styles.css');
  const viewerCss = gulp.src('app/styles/viewer.css');

  return streamqueue({objectMode: true}, reportCss, viewerCss)
    .pipe($.concat('viewer.css'))
    .pipe(gulp.dest(`dist/styles`));
});

gulp.task('html', () => {
  const templatesStr = ReportGenerator.reportTemplates;

  return gulp.src('app/index.html')
    .pipe($.replace(/%%LIGHTHOUSE_TEMPLATES%%/, _ => templatesStr))
    .pipe(gulp.dest('dist'));
});

gulp.task('pwa', () => {
  return gulp.src([
    'app/sw.js',
    'app/manifest.json',
  ]).pipe(gulp.dest('dist'));
});

gulp.task('polyfills', () => {
  return gulp.src([
    'node_modules/url-search-params/build/url-search-params.js',
    'node_modules/whatwg-fetch/fetch.js'
  ])
  .pipe(gulp.dest(`dist/src/polyfills`));
});

gulp.task('compile-js', () => {
  const filename = __dirname + '/../lighthouse-core/report/v2/report-generator.js';
  const opts = {standalone: 'ReportGenerator'};
  const generatorJs = browserify(filename, opts)
    .transform('brfs')
    .bundle()
    .pipe(source('report-generator.js'))
    .pipe(vinylBuffer());

  const baseReportJs = streamFromString(ReportGenerator.reportJs, 'report.js');

  const deps = gulp.src([
    'node_modules/idb-keyval/dist/idb-keyval-min.js',
  ]);

  // TODO(bckenny): can become glob
  const viewer = gulp.src([
    'app/src/firebase-auth.js',
    'app/src/github-api.js',
    'app/src/viewer.js',
    'app/src/drag-and-drop.js'
  ]);

  return streamqueue({objectMode: true}, generatorJs, baseReportJs, deps, viewer)
    .pipe($.concat('viewer.js', {newLine: ';\n'}))
    // .pipe(uglify())
    .pipe(license())
    .pipe(gulp.dest(`dist/src`));
});

gulp.task('clean', () => {
  return del(['dist']).then(paths =>
    paths.forEach(path => $.util.log('deleted:', $.util.colors.blue(path)))
  );
});

// gulp.task('watch', [
//   'lint',
//   'compile-js',
//   'polyfills',
//   'html',
//   'pwa',
//   'images',
//   'concat-css'], () => {
//     gulp.watch([
//       'app/styles/**/*.css',
//       '../lighthouse-core/report/styles/**/*.css',
//       '../lighthouse-core/report/partials/*.css'
//     ]).on('change', () => {
//       runSequence('concat-css');
//     });

//     gulp.watch([
//       'app/index.html',
//       'app/manifest.json',
//       'app/sw.js'
//     ]).on('change', () => {
//       runSequence('html');
//     });

//     gulp.watch([
//       `../${config.report}`
//     ], ['compileReport']);
//   });

gulp.task('create-dir-for-gh-pages', () => {
  del.sync([`dist/viewer`]);

  return gulp.src(`dist/**/*`)
    .pipe(gulp.dest(`dist/viewer/viewer`));
});

gulp.task('deploy', cb => {
  runSequence('clean', 'build', 'create-dir-for-gh-pages', function() {
    ghpages.publish(`dist/viewer`, {
      logger: $.util.log
    }, err => {
      if (err) {
        $.util.log(err);
      }
      cb();
    });
  });
});

gulp.task('build', cb => {
  runSequence(
    'compile-js',
    ['html', 'pwa', 'images', 'concat-css', 'polyfills'], cb);
});

gulp.task('default', ['clean'], cb => {
  runSequence('build', cb);
});
