import React from 'react';
import {shallow} from 'enzyme';
import {expect} from '../../../util/reconfiguredChai';
import sinon from 'sinon';
import {Factory} from 'rosie';
import './codeReview/CodeReviewTestHelper';
import {UnconnectedReviewTab as ReviewTab} from '@cdo/apps/templates/instructions/ReviewTab';
import Comment from '@cdo/apps/templates/instructions/codeReview/Comment';
import {
  getStore,
  registerReducers,
  restoreRedux,
  stubRedux
} from '@cdo/apps/redux';
import commonReducers from '@cdo/apps/redux/commonReducers';
import {setPageConstants} from '@cdo/apps/redux/pageConstants';

describe('Code Review Tab', () => {
  const channelId = 'test123';
  const existingComment = Factory.build('CodeReviewComment');
  let wrapper, server, clock;

  beforeEach(() => {
    server = sinon.fakeServer.create();
    server.respondWith(
      'GET',
      `/code_review_comments/project_comments?channel_id=${channelId}`,
      [
        200,
        {'Content-Type': 'application/json'},
        JSON.stringify([existingComment])
      ]
    );
    server.respondWith(
      'DELETE',
      `/code_review_comments/${existingComment.id}`,
      [200, {}, '']
    );
    server.respondWith(
      'PATCH',
      `/code_review_comments/${existingComment.id}/toggle_resolved`,
      [200, {}, '']
    );

    stubRedux();
    registerReducers(commonReducers);
    getStore().dispatch(
      setPageConstants({
        channelId: channelId
      })
    );

    wrapper = shallow(<ReviewTab viewAsCodeReviewer={false} />);
  });

  afterEach(() => {
    if (clock) {
      clock.restore();
    }

    server.restore();
    restoreRedux();
  });

  it('renders without error if project has no comments', () => {
    server.respondWith(
      'GET',
      `/code_review_comments/project_comments?channel_id=${channelId}`,
      [200, {'Content-Type': 'application/json'}, JSON.stringify([])]
    );
    server.respond();

    expect(wrapper.find(Comment).length).to.equal(0);
  });

  it('renders a comment fetched on mount if one exists', () => {
    expect(wrapper.find(Comment).length).to.equal(0);
    server.respond();
    expect(wrapper.find(Comment).length).to.equal(1);
  });

  it('submits request and shows new comment after one is created', () => {
    const testCommentText = 'test comment text';
    const newlyCreatedComment = Factory.build('CodeReviewComment', {
      commentText: testCommentText
    });

    server.respondWith('POST', '/code_review_comments', [
      200,
      {'Content-Type': 'application/json'},
      JSON.stringify(newlyCreatedComment)
    ]);

    server.respond();
    expect(wrapper.find(Comment).length).to.equal(1);

    wrapper.instance().onNewCommentSubmit(testCommentText);
    server.respond();
    expect(wrapper.find(Comment).length).to.equal(2);
    expect(
      wrapper
        .find(Comment)
        .at(1)
        .props().comment.commentText
    ).to.equal(testCommentText);
  });

  it('removes a comment when one is deleted', () => {
    server.respond();

    expect(wrapper.find(Comment).length).to.equal(1);
    wrapper.instance().onCommentDelete(existingComment.id);
    server.respond();
    expect(wrapper.find(Comment).length).to.equal(0);
  });

  it('resolves a comment when one is resolved', () => {
    server.respond();

    expect(
      wrapper
        .find(Comment)
        .at(0)
        .props().comment.isResolved
    ).to.be.false;
    wrapper.instance().onCommentResolveStateToggle(existingComment.id, true);
    server.respond();
    expect(
      wrapper
        .find(Comment)
        .at(0)
        .props().comment.isResolved
    ).to.be.true;
  });

  it('sets hasError to true when comment update request fails and does not update comment', () => {
    clock = sinon.useFakeTimers();

    server.respondWith(
      'PATCH',
      `/code_review_comments/${existingComment.id}/toggle_resolved`,
      [400, {}, '']
    );

    server.respond();

    expect(
      wrapper
        .find(Comment)
        .at(0)
        .props().comment.hasError
    ).to.be.undefined;
    expect(
      wrapper
        .find(Comment)
        .at(0)
        .props().comment.isResolved
    ).to.be.false;
    wrapper.instance().onCommentResolveStateToggle(existingComment.id, true);
    server.respond();
    expect(
      wrapper
        .find(Comment)
        .at(0)
        .props().comment.hasError
    ).to.be.true;
    expect(
      wrapper
        .find(Comment)
        .at(0)
        .props().comment.isResolved
    ).to.be.false;
  });

  it('sets hasError to true when comment delete request fails and does not remove comment from UI', () => {
    clock = sinon.useFakeTimers();

    server.respondWith(
      'DELETE',
      `/code_review_comments/${existingComment.id}`,
      [400, {}, '']
    );

    server.respond();

    expect(
      wrapper
        .find(Comment)
        .at(0)
        .props().comment.hasError
    ).to.be.undefined;
    wrapper.instance().onCommentDelete(existingComment.id, true);
    server.respond();
    expect(
      wrapper
        .find(Comment)
        .at(0)
        .props().comment.hasError
    ).to.be.true;
  });
});
