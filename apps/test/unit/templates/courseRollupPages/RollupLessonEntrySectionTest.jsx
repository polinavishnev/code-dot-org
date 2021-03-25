import React from 'react';
import {mount} from 'enzyme';
import {expect} from '../../../util/reconfiguredChai';
import RollupLessonEntrySection from '@cdo/apps/templates/courseRollupPages/RollupLessonEntrySection';
import {courseData} from './rollupTestData';
import i18n from '@cdo/locale';
import {Provider} from 'react-redux/src';
import {getStore} from '@cdo/apps/redux';
import EnhancedSafeMarkdown from '@cdo/apps/templates/EnhancedSafeMarkdown';

describe('RollupLessonEntrySection', () => {
  let defaultProps;
  beforeEach(() => {
    defaultProps = {
      objectToRollUp: 'Resources',
      lesson: courseData.units[0].lessons[0]
    };
  });

  it('renders list of resources when there are resources', () => {
    const wrapper = mount(<RollupLessonEntrySection {...defaultProps} />);

    expect(wrapper.find('ResourceList').length).to.equal(2);
  });

  it('renders no resources message when no resources', () => {
    const wrapper = mount(
      <RollupLessonEntrySection
        {...defaultProps}
        lesson={courseData.units[1].lessons[0]}
      />
    );

    expect(wrapper.containsMatchingElement(<p>{i18n.rollupNoResources()}</p>))
      .to.be.true;
  });

  it('renders list of prep when there is prep', () => {
    const wrapper = mount(
      <Provider store={getStore()}>
        <RollupLessonEntrySection {...defaultProps} objectToRollUp={'Prep'} />
      </Provider>
    );

    expect(
      wrapper.containsMatchingElement(
        <EnhancedSafeMarkdown
          markdown={defaultProps.lesson.preparation}
          expandableImages
        />
      )
    ).to.be.true;
  });

  it('renders no prep message when no prep', () => {
    const wrapper = mount(
      <RollupLessonEntrySection
        {...defaultProps}
        objectToRollUp={'Prep'}
        lesson={courseData.units[1].lessons[0]}
      />
    );

    expect(wrapper.containsMatchingElement(<p>{i18n.rollupNoPrep()}</p>)).to.be
      .true;
  });

  it('renders list of vocab when there is vocab', () => {
    const wrapper = mount(
      <RollupLessonEntrySection
        {...defaultProps}
        objectToRollUp={'Vocabulary'}
      />
    );

    expect(wrapper.text()).to.include('word');
    expect(wrapper.text()).to.include('definition');
  });

  it('renders no vocab message when no vocab', () => {
    const wrapper = mount(
      <RollupLessonEntrySection
        {...defaultProps}
        objectToRollUp={'Vocabulary'}
        lesson={courseData.units[1].lessons[0]}
      />
    );

    expect(wrapper.containsMatchingElement(<p>{i18n.rollupNoVocab()}</p>)).to.be
      .true;
  });

  it('renders list of code when there is code', () => {
    const wrapper = mount(
      <RollupLessonEntrySection {...defaultProps} objectToRollUp={'Code'} />
    );

    expect(wrapper.find('StyledCodeBlock').length).to.equal(1);
  });

  it('renders no code message when no code', () => {
    const wrapper = mount(
      <RollupLessonEntrySection
        {...defaultProps}
        objectToRollUp={'Code'}
        lesson={courseData.units[1].lessons[0]}
      />
    );

    expect(wrapper.containsMatchingElement(<p>{i18n.rollupNoCode()}</p>)).to.be
      .true;
  });
});
