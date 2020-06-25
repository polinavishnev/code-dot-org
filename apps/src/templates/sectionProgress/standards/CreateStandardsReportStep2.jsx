import PropTypes from 'prop-types';
import React, {Component} from 'react';
import i18n from '@cdo/locale';
import Button from '../../Button';
import DialogFooter from '../../teacherDashboard/DialogFooter';
import SafeMarkdown from '@cdo/apps/templates/SafeMarkdown';
import {teacherDashboardUrl} from '@cdo/apps/templates/teacherDashboard/urlHelpers';
import {connect} from 'react-redux';

const styles = {
  textArea: {
    minHeight: 100,
    width: '95%'
  },
  header: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center'
  },
  optionalText: {
    paddingLeft: 10
  }
};

class CreateStandardsReportStep2 extends Component {
  static propTypes = {
    sectionId: PropTypes.number,
    linkToStandardsOverview: PropTypes.string,
    onBack: PropTypes.func.isRequired,
    handleConfirm: PropTypes.func.isRequired,
    onCommentChange: PropTypes.func.isRequired,
    //redux
    teacherComment: PropTypes.string
  };

  commentChanged = event => {
    const cursorPosition = event.target.selectionStart;
    const commentBox = event.target;
    window.requestAnimationFrame(() => {
      commentBox.selectionStart = cursorPosition;
      commentBox.selectionEnd = cursorPosition;
    });
    this.props.onCommentChange(event.target.value);
  };

  render() {
    return (
      <div>
        <div style={styles.header}>
          <h3>{i18n.createStandardsReportStep2()}</h3>
          <span style={styles.optionalText}>{i18n.optional()}</span>
        </div>
        <SafeMarkdown markdown={i18n.createStandardsReportPrompt()} />
        <SafeMarkdown markdown={i18n.createStandardsReportSuggestion()} />
        <ul>
          <li>
            <SafeMarkdown markdown={i18n.createStandardsReportSuggestion1()} />
          </li>
          <li>
            {this.props.linkToStandardsOverview && (
              <SafeMarkdown
                openExternalLinksInNewTab={true}
                markdown={i18n.createStandardsReportSuggestion2Link({
                  standardsOverviewLink: this.props.linkToStandardsOverview
                })}
              />
            )}
            {!this.props.linkToStandardsOverview && (
              <SafeMarkdown
                markdown={i18n.createStandardsReportSuggestion2()}
              />
            )}
          </li>
          <li>
            <SafeMarkdown
              openExternalLinksInNewTab={true}
              markdown={i18n.createStandardsReportSuggestion4({
                projectsLink: teacherDashboardUrl(
                  this.props.sectionId,
                  '/projects'
                )
              })}
            />
          </li>
        </ul>
        <textarea
          type="text"
          placeholder={i18n.createStandardsReportSampleNoteText()}
          value={
            this.props.teacherComment ? this.props.teacherComment : undefined
          }
          onChange={this.commentChanged}
          style={styles.textArea}
        />
        <DialogFooter>
          <Button
            __useDeprecatedTag
            text={i18n.back()}
            onClick={this.props.onBack}
            color={Button.ButtonColor.gray}
          />
          <Button
            __useDeprecatedTag
            text={i18n.createReport()}
            onClick={this.props.handleConfirm}
            color={Button.ButtonColor.orange}
            className="uitest-standards-generate-report-finish"
          />
        </DialogFooter>
      </div>
    );
  }
}

export const UnconnectedCreateStandardsReportStep2 = CreateStandardsReportStep2;

export default connect(state => ({
  teacherComment: state.sectionStandardsProgress.teacherComment
}))(CreateStandardsReportStep2);
