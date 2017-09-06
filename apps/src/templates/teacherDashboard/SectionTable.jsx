import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import color from "@cdo/apps/util/color";
import {Table, sort} from 'reactabular';
import i18n from '@cdo/locale';
import { styles as tableStyles } from '@cdo/apps/templates/studioHomepages/SectionsTable';
import styleConstants from '@cdo/apps/styleConstants';
import wrappedSortable from '../tables/wrapped_sortable';
import orderBy from 'lodash/orderBy';
import {getSectionRows} from './teacherSectionsRedux';
import {sortableSectionShape} from "./shapes";
import {styles as reactTableStyles} from '../projects/PersonalProjectsTable';
import {pegasus} from "../../lib/util/urlHelpers";
import {ProviderManagedSectionCode} from "./SectionRow";
import SectionTableButtonCell from "./SectionTableButtonCell";

/** @enum {number} */
export const COLUMNS = {
  SECTION_NAME: 0,
  GRADE: 1,
  COURSE: 2,
  STUDENTS: 3,
  LOGIN_INFO: 4,
  EDIT_DELETE: 5,
};

const styles = {
  table: {
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: color.border_gray,
    width: styleConstants['content-width'],
    backgroundColor: color.table_light_row
  },
  headerRow: tableStyles.headerRow,
  col: tableStyles.col,
  colText: tableStyles.colText,
  link: tableStyles.link,
  headerRowPadding: {
    paddingTop: 20,
    paddingBottom: 20,
    color: color.charcoal,
  },
  cell: reactTableStyles.cell,
  currentUnit: {
    marginTop: 10
  },
};

const sectionDataPropType = PropTypes.shape({sortableSectionShape});

// Cell formatters for sortable SectionTable.
export const sectionLinkFormatter = function (name, {rowData}) {
  const pegasusUrl = pegasus('/teacher-dashboard#/sections/' + rowData.id);
  return <a style={styles.link} href={pegasusUrl} target="_blank">{rowData.name}</a>;
};

export const courseLinkFormatter = function (course, {rowData}) {
  if (rowData.assignmentName && rowData.assignmentName[0]){
    if (rowData.assignmentName[1]) {
      return (
          <div>
            <a href={rowData.assignmentPaths[0]} style={styles.link}>{rowData.assignmentName[0]}</a>
            <div style={styles.currentUnit}>
              <div>{i18n.currentUnit()}</div>
              <a href={rowData.assignmentPaths[1]} style={styles.link}>
                {rowData.assignmentName[1]}
              </a>
            </div>
          </div>);
    } else {
      return <a href={rowData.assignmentPaths[0]} style={styles.link}>{rowData.assignmentName[0]}</a>;
    }
  }
};

export const gradeFormatter = function (grade, {rowData}) {
  return <div>{rowData.grade}</div>;
};

export const loginInfoFormatter = function (loginType, {rowData}) {
  let sectionCode = '';
  if (rowData.providerManaged) {
    sectionCode = <ProviderManagedSectionCode provider={rowData.loginType}/>;
  } else {
    sectionCode = rowData.code;
  }
  return <div>{sectionCode}</div>;
};

export const studentsFormatter = function (studentCount, {rowData}) {
  const pegasusUrl = pegasus('/teacher-dashboard#/sections/' + rowData.id + "/manage");
  const studentText = rowData.studentCount <= 0 ? i18n.addStudents() : rowData.studentCount;
  return <a style={styles.link} href={pegasusUrl} target="_blank">{studentText}</a>;
};

/**
 * This is a component that shows information about the sections that a teacher
 * owns, and allows for editing, deleting and sorting them.
 * It shows some of the same information as the SectionsTable used on the teacher
 * homepage. However, for historical reasons it unfortunately has a somewhat
 * different set/shape of input data. This component gets its data from
 * section_api_helpers in pegasus via an AJAX call, whereas that component gets
 * its data from section.summarize on page load.
 * Both ultimately source data from the dashboard db.
 * Long term it would be ideal if section_api_helpers went away and both components
 * used dashboard.
 */
class SectionTable extends Component {
  static propTypes = {
    onEdit: PropTypes.func,

    //Provided by redux
    sectionRows: PropTypes.arrayOf(sectionDataPropType),
  };

  state = {
    sortingColumns: {
      [COLUMNS.SECTION_NAME]: {
        direction: 'desc',
        position: 0
      }
    }
  };

  editDeleteFormatter = (temp, {rowData}) => {
    return <SectionTableButtonCell sectionData={rowData} handleEdit={this.props.onEdit}/>;
  };

  // The user requested a new sorting column. Adjust the state accordingly.
  onSort = (selectedColumn) => {
    this.setState({
      sortingColumns: sort.byColumn({
        sortingColumns: this.state.sortingColumns,
        // Custom sortingOrder removes 'no-sort' from the cycle
        sortingOrder: {
          FIRST: 'asc',
          asc: 'desc',
          desc: 'asc'
        },
        selectedColumn
      })
    });
  };

  getSortingColumns = () => {
    return this.state.sortingColumns || {};
  };

  getColumns = (sortable) => {
    const colHeaderStyle = {...styles.headerRow, ...styles.headerRowPadding};

    return [
      {
        property: 'name',
        header: {
          label: i18n.section(),
          props: {style: colHeaderStyle},
          transforms: [sortable],
        },
        cell: {
          format: sectionLinkFormatter,
          props: {style: styles.cell}
        }
      },
      {
        property: 'grade',
        header: {
          label: i18n.grade(),
          props: {style: colHeaderStyle},
          transforms: [sortable],
        },
        cell: {
          format: gradeFormatter,
          props: {style: styles.cell}
        }
      },
      {
        property: 'course',
        header: {
          label: i18n.course(),
          props: {style: colHeaderStyle},
          transforms: [sortable],
        },
        cell: {
          format: courseLinkFormatter,
          props: {style: styles.cell}
        }
      },
      {
        property: 'studentCount',
        header: {
          label: i18n.students(),
          props: {style: colHeaderStyle},
          transforms: [sortable],
        },
        cell: {
          format: studentsFormatter,
          props: {style: styles.cell}
        }
      },
      {
        property: 'loginType',
        header: {
          label: i18n.loginInfo(),
          props:{style: colHeaderStyle},
          transforms: [sortable],
        },
        cell: {
          format: loginInfoFormatter,
          props: {style: styles.cell}
        }
      },
      {
        property: 'editDelete',
        header: {
          props:{style: colHeaderStyle},
        },
        cell: {
          format: this.editDeleteFormatter,
          props: {style: styles.cell}
        }
      }
    ];
  };

  render() {
    const sortableOptions = {
      // Dim inactive sorting icons in the column headers
      default: {color: 'rgba(255, 255, 255, 0.2 )'}
    };


    const sortable = wrappedSortable(this.getSortingColumns, this.onSort, sortableOptions);
    const columns = this.getColumns(sortable);
    const sortingColumns = this.getSortingColumns();

    const sortedRows = sort.sorter({
      columns,
      sortingColumns,
      sort: orderBy,
    })(this.props.sectionRows);

    return (
      <Table.Provider
        columns={columns}
        style={styles.table}
      >
        <Table.Header />
        <Table.Body rows={sortedRows} rowKey="id" />
      </Table.Provider>
    );
  }
}

export const UnconnectedSectionTable = SectionTable;

export default connect(state => ({
  sectionRows: getSectionRows(state)
}))(SectionTable);
