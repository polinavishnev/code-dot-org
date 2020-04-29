import {assert} from 'chai';
import React from 'react';
import {UnconnectedAgeDialog as AgeDialog} from '@cdo/apps/templates/AgeDialog';
import {shallow} from 'enzyme';
import sinon from 'sinon';

class FakeSessionStorage {
  getItem() {}
  setItem() {}
}

describe('AgeDialog', () => {
  const defaultProps = {
    signedIn: false,
    turnOffFilter: () => {},
    sessionStorage: new FakeSessionStorage()
  };

  it('renders null if user is signed in', () => {
    const wrapper = shallow(<AgeDialog {...defaultProps} signedIn={true} />);
    assert.equal(wrapper.children().length, 0);
  });

  it('renders null if dialog was seen before', () => {
    let getItem = sinon.stub(defaultProps.sessionStorage, 'getItem');
    getItem.withArgs('ad_anon_over13').returns('true');
    const wrapper = shallow(<AgeDialog {...defaultProps} />);
    assert.equal(wrapper.children().length, 0);
    getItem.restore();
  });

  it('renders a dialog if neither signed in nor seen before', () => {
    const wrapper = shallow(<AgeDialog {...defaultProps} />);
    assert.equal(wrapper.name(), 'BaseDialog');
  });
});
