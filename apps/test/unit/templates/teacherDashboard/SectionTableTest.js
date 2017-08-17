import { assert, expect } from '../../../util/configuredChai';
import { throwOnConsoleWarnings } from '../../../util/testUtils';
import experiments, {SECTION_FLOW_2017} from '@cdo/apps/util/experiments';
import React from 'react';
import { shallow } from 'enzyme';
import { UnconnectedSectionTable as SectionTable }
  from '@cdo/apps/templates/teacherDashboard/SectionTable';

describe('SectionTable', () => {
  throwOnConsoleWarnings();

  it('has one SectionRow per passed in section', () => {
    const wrapper = shallow(
      <SectionTable
        sectionIds={[1,2,3]}
      />
    );
    const rows = wrapper.find('Connect(SectionRow)');
    assert.equal(rows.length, 3);
  });

  describe(`(${SECTION_FLOW_2017})`, () => {
    beforeEach(() => experiments.setEnabled(SECTION_FLOW_2017, true));
    afterEach(() => experiments.setEnabled(SECTION_FLOW_2017, false));

    it('is 970px wide', () => {
      const wrapper = shallow(<SectionTable sectionIds={[1, 2, 3]}/>);
      const style = wrapper.prop('style');
      expect(style).to.include({'width': 970});
    });

    it('has six column headers', () => {
      const wrapper = shallow(<SectionTable sectionIds={[1, 2, 3]}/>);
      const headers = wrapper.find('thead tr td');
      expect(headers.map(h => h.text())).to.deep.equal([
        'Section',
        'Grade',
        'Course',
        'Students',
        'Section Code',
        '', // buttons
      ]);
    });
  });

});
