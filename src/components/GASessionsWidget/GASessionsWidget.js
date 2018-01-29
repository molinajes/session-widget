import React from 'react';
import { Button, ButtonGroup } from 'reactstrap';
import 'bootstrap/dist/css/bootstrap.css';
import { Chart } from 'react-google-charts';
import moment from 'moment'
import '../../scss/GASessionsWidget/GASessionsWidget.scss';

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


const CLIENT_ID = "<client-id>"
const ids = "ga:<view-id>"

const buttons = ['Day', 'Week', 'Month']
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
                  rows: [
                    ['',0,0,0]
                  ],
                  columns: [
                    {type: 'string', label: 'Day',},
                    {type: 'number', label: 'Total Users',},
                    {type: 'number', label: 'Returned Users',},
                    {type: 'number', label: 'New Users',},
                  ],
                }
              }

              handleClick = (activeAttr) => {
                this.setState({activeAttr})
                this.loadAnalytics(activeAttr)
              }

              init = () => {
                const doAuth = () => {
                  gapi.analytics.auth &&
                  gapi.analytics.auth.authorize({
                    clientid: CLIENT_ID,
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

              loadAnalytics = (activeAttr) => {
                const self = this
                const dates = ['1daysAgo', '7daysAgo', '30daysAgo']
                const sessions = query({
                  'ids': ids,
                  'dimensions': 'ga:date',
                  'metrics': 'ga:sessions',
                  'segment': 'gaid::-1',
                  'start-date': dates[activeAttr],
                  'end-date': 'yesterday',
                });

                const returnedUsers = query({
                  'ids': ids,
                  'dimensions': 'ga:date',
                  'metrics': 'ga:sessions',
                  'segment': 'gaid::-3',
                  'start-date': dates[activeAttr],
                  'end-date': 'yesterday',
                });

                const newUsers = query({
                  'ids': ids,
                  'dimensions': 'ga:date',
                  'metrics': 'ga:sessions',
                  'segment': 'gaid::-2',
                  'start-date': dates[activeAttr],
                  'end-date': 'yesterday',
                });

                Promise.all([sessions, returnedUsers, newUsers]).then(function(results) {

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
                          columns={this.state.columns}
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

function query(params) {
  return new Promise(function(resolve, reject) {
    var data = new gapi.analytics.report.Data({query: params});
    data.once('success', function(response) { resolve(response); })
      .once('error', function(response) { reject(response); })
      .execute();
  });
}