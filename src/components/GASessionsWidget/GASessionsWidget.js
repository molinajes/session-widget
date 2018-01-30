import React from 'react';
import { Button, ButtonGroup } from 'reactstrap';
import 'bootstrap/dist/css/bootstrap.css';
import { Chart } from 'react-google-charts';
import moment from 'moment'
import '../../scss/GASessionsWidget/GASessionsWidget.scss';

// google script
;(function(w, d, s, g, js, fjs) {
  g = w.gapi || (w.gapi = {})
  g.analytics = {
    q: [],
    ready: function(cb) {
      this.q.push(cb)
    }
  }
  js = d.createElement(s)
  fjs = d.getElementsByTagName(s)[0]
  js.src = "https://apis.google.com/js/platform.js"
  fjs.parentNode.insertBefore(js, fjs)
  js.onload = function() {
    g.load("analytics")
  }
})(window, document, "script")

// Buttons to change period titles
const buttons = ['Day', 'Week', 'Month']

// Options for a GoogleCharts
const options = {
  title: 'Sessions',
    titlePosition: 'out',
    titleTextStyle: {
    fontSize: 16,
      bold: false,
  },
  curveType: 'none',
    chartArea:{left:50,top:40, bottom: 60, width:"100%",height:"100%"},
  legend: { position: 'bottom' },
  vAxis: {viewWindow: {min: 0}},
  hAxis: {gridlines: {color: 'transparent'}},
  lineWidth: 2,
    colors: ['#1976D2', '#F57C00', '#388E3C'],
}

// Legend names and data types for chart
const columns = [
  {type: 'string', label: 'Day',},
  {type: 'number', label: 'Total Users',},
  {type: 'number', label: 'Returned Users',},
  {type: 'number', label: 'New Users',},
]

definejs('GASessionsWidget', function create (){

    return {
        createComponent: function (React, Component) {
            return class GASessionsWidget extends Component {

              constructor (props){
                super(props);
                this.state = {
                  mode: this.props.mode,
                  isEditing: this.props.mode == 'edit' ? true : false,
                  ready: false,
                  activeAttr: 0,
                  client_id: this.props.clientID, // Google Client ID
                  view_id: `ga:${this.props.viewID}`, // Google View ID
                  rows: [
                    ['',0,0,0]
                  ],
                }
              }

              // Handle change period click
              handleClick = (activeAttr) => {
                this.setState({activeAttr})
                this.loadAnalytics(activeAttr)
              }

              // Google account authorization
              init = () => {
                const doAuth = () => {
                  gapi.analytics.auth &&
                  gapi.analytics.auth.authorize({
                    clientid: this.state.client_id,
                    container: this.authButtonNode,
                  });
                }

                gapi.analytics.ready(a => {
                  gapi.analytics.auth.on('success', response => {
                    this.authButtonNode.style.display='none';
                    this.setState({
                      ready: true,
                    });
                    this.loadAnalytics(this.state.activeAttr)
                  });
                  doAuth();
                })
              }

              // Load data from Google Analytics for current active settings
              loadAnalytics = (activeAttr) => {
                const self = this
                const attr = ['1daysAgo', '7daysAgo', '30daysAgo']
                const query1 = query({
                  'ids': this.state.view_id,
                  'dimensions': 'ga:date',
                  'metrics': 'ga:sessions',
                  'segment': 'gaid::-1',
                  'start-date': attr[activeAttr],
                  'end-date': 'yesterday',
                });

                const query2 = query({
                  'ids': this.state.view_id,
                  'dimensions': 'ga:date',
                  'metrics': 'ga:sessions',
                  'segment': 'gaid::-3',
                  'start-date': attr[activeAttr],
                  'end-date': 'yesterday',
                });

                const query3 = query({
                  'ids': this.state.view_id,
                  'dimensions': 'ga:date',
                  'metrics': 'ga:sessions',
                  'segment': 'gaid::-2',
                  'start-date': attr[activeAttr],
                  'end-date': 'yesterday',
                });

                Promise.all([query1, query2, query3]).then(function(results) {

                  var data1 = results[0].rows.map(function(row) { return +row[1]; });
                  var data2 = results[1].rows.map(function(row) { return +row[1]; });
                  var data3 = results[2].rows.map(function(row) { return +row[1]; });
                  var labels = results[0].rows.map(function(row) { return +row[0]; });

                  const rows  = labels.map(function (value, index) {
                    return [moment(value, 'YYYYMMDD').format('D MMM'), data1[index], data2[index], data3[index]]
                  })
                  self.setState({rows})
                });
              }

              componentDidMount() {
                this.init()
              }

              render() {
                let widgetStyle = {
                  textAlign: this.props.widgetStyle.textAlign,
                  fontWeight: this.props.widgetStyle.isBold ? 'bold' : 'normal',
                  color: this.props.widgetStyle.textColor,
                  fontStyle: this.props.widgetStyle.isItalic ? 'italic' : 'normal',
                  fontFamily: this.props.widgetStyle.fontFamily,
                  fontSize: this.props.widgetStyle.fontSize
                }

                return (
                  <div style={{display: 'block', width: 350, margin: 0}}>
                    <div ref={node => (this.authButtonNode = node)}/>
                    {this.state.ready ?
                      (<div style={{marginTop: 10}}>
                        <div style={{display: 'flex', justifyContent: 'flex-end'}}>
                          <ButtonGroup size="xs" color="secondary">
                            {buttons.map((title, index) =>
                              (<Button
                                key={index}
                                outline
                                onClick={() => this.handleClick(index)}
                                active={index === this.state.activeAttr}
                                style={{height: 24}}>
                                {title}
                              </Button>))
                            }
                          </ButtonGroup>
                        </div>
                        <Chart
                          chartType="LineChart"
                          // rows={this.state.rows}
                          rows={this.state.rows}
                          columns={columns}
                          options={options}
                          width={'100%'}
                          legend_toggle
                        />
                      </div>)
                      : null
                    }
                  </div>
                )
              }
            }
        }
    }
})

// Request for Google Analytics report
function query(params) {
  return new Promise(function(resolve, reject) {
    var data = new gapi.analytics.report.Data({query: params});
    data.once('success', function(response) { resolve(response); })
      .once('error', function(response) { reject(response); })
      .execute();
  });
}