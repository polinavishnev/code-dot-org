import React from 'react';
import ReactDOM from 'react-dom';
import getScriptData from '@cdo/apps/util/getScriptData';
import CertificateBatch from '@cdo/apps/templates/certificates/CertificateBatch';
import analyticsReporter from '@cdo/apps/lib/util/AnalyticsReporter';
import {EVENTS} from '@cdo/apps/lib/util/AnalyticsConstants';

$(document).ready(function () {
  const certificateData = getScriptData('certificate');
  const {courseName, courseTitle, studentNames, imageUrl} = certificateData;
  analyticsReporter.sendEvent(EVENTS.BATCH_CERTIFICATES_PAGE_VIEWED);
  ReactDOM.render(
    <CertificateBatch
      courseName={courseName}
      courseTitle={courseTitle}
      initialStudentNames={studentNames}
      imageUrl={imageUrl}
    />,
    document.getElementById('certificate-batch')
  );
});
