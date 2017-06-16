/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* global ReportUIFeatures, ReportGenerator */

class ViewerUiFeatures extends ReportUIFeatures {
  /**
   * @param {!DOM} dom
   * @param {?function(!ReportRenderer.ReportJSON)} saveGistCallback
   */
  constructor(dom, saveGistCallback) {
    super(dom);

    this._saveGistCallback = saveGistCallback;
  }

  /**
   * Returns the html that recreates this report. Uses ReportGenerator
   * @return {string}
   * @override
   */
  getReportHtml() {
    return new ReportGenerator().generateReportHtml(this.json);
  }

  /**
   * @override
   */
  sendJsonReport() {
    throw new Error('Cannot send JSON to Viewer from Viewer.');
  }

  /**
   * @override
   */
  saveAsGist() {
    this._saveGistCallback(this.json);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ViewerUiFeatures;
}
