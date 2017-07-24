import React from 'react';
import PublishDialog from './PublishDialog';

const PROJECT_ID = 'MY_PROJECT_ID';
const PROJECT_TYPE = 'MY_PROJECT_TYPE';

export default storybook => {
  return storybook
    .storiesOf('PublishDialog', module)
    .addStoryTable([
      {
        name: 'Publish Dialog',
        description: '',
        story: () => {
          return (
            <PublishDialog
              isOpen={true}
              onClose={storybook.action('close')}
              onConfirmPublish={storybook.action('publish')}
              projectId={PROJECT_ID}
              projectType={PROJECT_TYPE}
            />
          );
        }
      }
    ]);
};
