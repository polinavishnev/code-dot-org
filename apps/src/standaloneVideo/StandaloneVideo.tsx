// StandaloneVideo
//
// This is a React client for a standalone_video level.  Note that this is
// only used for levels that use Lab2.  For levels that don't use Lab2,
// they will get an older-style level implemented with a HAML page and some
// non-React JS code.

import React from 'react';
import {useSelector} from 'react-redux';
import {useAppDispatch} from '@cdo/apps/util/reduxHooks';
import Video from './Video';
import {
  sendSuccessReport,
  navigateToNextLevel,
} from '@cdo/apps/code-studio/progressRedux';
import {LabState} from '@cdo/apps/lab2/lab2Redux';
import {VideoLevelData} from '@cdo/apps/lab2/types';
import standaloneVideoLocale from './locale';
import styles from './video.module.scss';

const StandaloneVideo: React.FunctionComponent = () => {
  const dispatch = useAppDispatch();
  const levelVideo: VideoLevelData = useSelector(
    (state: {lab: LabState}) => state.lab.levelData
  ) as VideoLevelData;

  const nextButtonPressed = () => {
    const appType = 'standalone_video';
    dispatch(sendSuccessReport(appType));
    dispatch(navigateToNextLevel());
  };

  return (
    <div id="standalone-video">
      <Video src={levelVideo?.src}>
        <button
          id="standalone-video-continue-button"
          type="button"
          onClick={() => nextButtonPressed()}
          className={styles.buttonNext}
        >
          {standaloneVideoLocale.continue()}
        </button>
      </Video>
    </div>
  );
};

export default StandaloneVideo;
