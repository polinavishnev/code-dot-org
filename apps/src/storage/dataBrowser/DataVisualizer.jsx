import React from 'react';
import Radium from 'radium';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import BaseDialog from '@cdo/apps/templates/BaseDialog.jsx';
import DropdownField from './DropdownField';
import * as dataStyles from './dataStyles';
import * as rowStyle from '@cdo/apps/applab/designElements/rowStyle';
import GoogleChart from '@cdo/apps/applab/GoogleChart';

const INITIAL_STATE = {
  isVisualizerOpen: false,
  chartTitle: '',
  chartType: '',
  numBins: 0,
  values: '',
  xValues: '',
  yValues: '',
  parsedRecords: []
};

class DataVisualizer extends React.Component {
  static propTypes = {
    // from redux state
    tableColumns: PropTypes.arrayOf(PropTypes.string).isRequired,
    tableName: PropTypes.string.isRequired,
    // "if all of the keys are integers, and more than half of the keys between 0 and
    // the maximum key in the object have non-empty values, then Firebase will render
    // it as an array."
    // https://firebase.googleblog.com/2014/04/best-practices-arrays-in-firebase.html
    tableRecords: PropTypes.oneOfType([PropTypes.object, PropTypes.array])
      .isRequired
  };

  state = {...INITIAL_STATE};

  handleOpen = () => {
    this.setState({isVisualizerOpen: true});
  };

  handleClose = () => {
    this.setState({isVisualizerOpen: false});
  };

  aggregateRecordsByColumn = (records, columnName) => {
    let counts = {};
    records.forEach(record => {
      let value = record[columnName];
      counts[value] = (counts[value] || 0) + 1;
    });
    let chartData = [];
    Object.keys(counts).forEach(key => {
      chartData.push({[columnName]: key, count: counts[key]});
    });
    return chartData;
  };

  updateChart = () => {
    const targetDiv = document.getElementById('chart-area');
    if (!targetDiv) {
      return;
    }

    let chart;
    let chartData;
    const columns = [];
    const options = {};
    switch (this.state.chartType) {
      case 'Bar Chart':
        if (this.state.values) {
          chart = new GoogleChart.MaterialBarChart(targetDiv);
          chartData = this.aggregateRecordsByColumn(
            this.state.parsedRecords,
            this.state.values
          );
          columns.push(this.state.values, 'count');
        }
        break;
      case 'Histogram':
        console.warn(`${this.state.chartType} not yet implemented`);
        break;
      case 'Cross Tab':
        console.warn(`${this.state.chartType} not yet implemented`);
        break;
      case 'Scatter Plot':
        console.warn(`${this.state.chartType} not yet implemented`);
        break;
      default:
        console.warn(`unknown chart type ${this.state.chartType}`);
        break;
    }
    if (chart && chartData) {
      chart.drawChart(chartData, columns, options);
    }
  };

  parseRecords = () => {
    if (Object.keys(this.props.tableRecords).length === 0) {
      return [];
    } else {
      let parsedRecords = [];
      this.props.tableRecords.forEach(record => {
        if (record) {
          parsedRecords.push(JSON.parse(record));
        }
      });
      return parsedRecords;
    }
  };

  componentDidUpdate(previousProps, prevState) {
    if (this.props !== previousProps) {
      this.setState({parsedRecords: this.parseRecords()});
    }
  }

  render() {
    if (
      this.state.isVisualizerOpen &&
      this.props.tableRecords &&
      this.state.chartType
    ) {
      this.updateChart();
    }

    const modalBody = (
      <div>
        <h1> Explore {this.props.tableName} </h1>
        <h2> Overview </h2>
        <div id="selection-area">
          <div style={rowStyle.container}>
            <label style={rowStyle.description}>Chart Title</label>
            <input
              style={rowStyle.input}
              value={this.state.chartTitle}
              onChange={event =>
                this.setState({chartTitle: event.target.value})
              }
            />
          </div>

          <DropdownField
            displayName="Chart Type"
            options={['Bar Chart', 'Histogram', 'Cross Tab', 'Scatter Plot']}
            value={this.state.chartType}
            onChange={event => this.setState({chartType: event.target.value})}
          />

          {this.state.chartType === 'Histogram' && (
            <div id="numBinsRow" style={rowStyle.container}>
              <label style={rowStyle.description}>Bins</label>
              <input
                style={rowStyle.input}
                value={this.state.numBins}
                onChange={event => this.setState({numBins: event.target.value})}
              />
            </div>
          )}
          {(this.state.chartType === 'Bar Chart' ||
            this.state.chartType === 'Histogram') && (
            <DropdownField
              displayName="Values"
              options={this.props.tableColumns}
              value={this.state.values}
              onChange={event => this.setState({values: event.target.value})}
            />
          )}

          {(this.state.chartType === 'Cross Tab' ||
            this.state.chartType === 'Scatter Plot') && (
            <div>
              <DropdownField
                displayName="X Values"
                options={this.props.tableColumns}
                value={this.state.xValues}
                onChange={event => this.setState({xValues: event.target.value})}
              />
              <DropdownField
                displayName="Y Values"
                options={this.props.tableColumns}
                value={this.state.yValues}
                onChange={event => this.setState({yValues: event.target.value})}
              />
            </div>
          )}
        </div>
        <div id="chart-area" />
      </div>
    );

    return (
      <span style={{display: 'inline-block'}}>
        <button
          type="button"
          style={dataStyles.whiteButton}
          onClick={this.handleOpen}
        >
          Show Viz (Placeholder)
        </button>
        <BaseDialog
          isOpen={this.state.isVisualizerOpen}
          handleClose={this.handleClose}
          fullWidth
          fullHeight
        >
          {modalBody}
        </BaseDialog>
      </span>
    );
  }
}

export const UnconnectedDataVisualizer = Radium(DataVisualizer);

export default connect(state => ({
  tableColumns: state.data.tableColumns || [],
  tableRecords: state.data.tableRecords || {},
  tableName: state.data.tableName || ''
}))(Radium(DataVisualizer));
