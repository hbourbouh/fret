// *****************************************************************************
// Notices:
// 
// Copyright � 2019 United States Government as represented by the Administrator
// of the National Aeronautics and Space Administration.  All Rights Reserved.
// 
// Disclaimers
// 
// No Warranty: THE SUBJECT SOFTWARE IS PROVIDED "AS IS" WITHOUT ANY WARRANTY OF
// ANY KIND, EITHER EXPRESSED, IMPLIED, OR STATUTORY, INCLUDING, BUT NOT LIMITED
// TO, ANY WARRANTY THAT THE SUBJECT SOFTWARE WILL CONFORM TO SPECIFICATIONS, 
// ANY IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, 
// OR FREEDOM FROM INFRINGEMENT, ANY WARRANTY THAT THE SUBJECT SOFTWARE WILL BE
// ERROR FREE, OR ANY WARRANTY THAT DOCUMENTATION, IF PROVIDED, WILL CONFORM TO
// THE SUBJECT SOFTWARE. THIS AGREEMENT DOES NOT, IN ANY MANNER, CONSTITUTE AN
// ENDORSEMENT BY GOVERNMENT AGENCY OR ANY PRIOR RECIPIENT OF ANY RESULTS,
// RESULTING DESIGNS, HARDWARE, SOFTWARE PRODUCTS OR ANY OTHER APPLICATIONS
// RESULTING FROM USE OF THE SUBJECT SOFTWARE.  FURTHER, GOVERNMENT AGENCY
// DISCLAIMS ALL WARRANTIES AND LIABILITIES REGARDING THIRD-PARTY SOFTWARE, IF
// PRESENT IN THE ORIGINAL SOFTWARE, AND DISTRIBUTES IT ''AS IS.''
// 
// Waiver and Indemnity:  RECIPIENT AGREES TO WAIVE ANY AND ALL CLAIMS AGAINST
// THE UNITED STATES GOVERNMENT, ITS CONTRACTORS AND SUBCONTRACTORS, AS WELL AS
// ANY PRIOR RECIPIENT.  IF RECIPIENT'S USE OF THE SUBJECT SOFTWARE RESULTS IN
// ANY LIABILITIES, DEMANDS, DAMAGES, EXPENSES OR LOSSES ARISING FROM SUCH USE,
// INCLUDING ANY DAMAGES FROM PRODUCTS BASED ON, OR RESULTING FROM, RECIPIENT'S
// USE OF THE SUBJECT SOFTWARE, RECIPIENT SHALL INDEMNIFY AND HOLD HARMLESS THE
// UNITED STATES GOVERNMENT, ITS CONTRACTORS AND SUBCONTRACTORS, AS WELL AS ANY
// PRIOR RECIPIENT, TO THE EXTENT PERMITTED BY LAW.  RECIPIENT'S SOLE REMEDY FOR
// ANY SUCH MATTER SHALL BE THE IMMEDIATE, UNILATERAL TERMINATION OF THIS
// AGREEMENT.
// *****************************************************************************
// @flow
import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemAvatar from '@material-ui/core/ListItemAvatar';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import ListSubheader from '@material-ui/core/ListSubheader';
import Avatar from '@material-ui/core/Avatar';
import IconButton from '@material-ui/core/IconButton';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import Typography from '@material-ui/core/Typography';
import UnformalizedIcon from '@material-ui/icons/Warning';
import Tooltip from '@material-ui/core/Tooltip';
import Divider from '@material-ui/core/Divider';

const sharedObj = require('electron').remote.getGlobal('sharedObj')
const db = sharedObj.db;
const system_dbkeys = sharedObj.system_dbkeys;
var dbChangeListener = undefined;

const constants = require('../parser/Constants');

const styles = theme => ({
  root: {
    flexGrow: 1,
  },
  list: {
  },
  title: {
    margin: `${theme.spacing.unit * 4}px 0 ${theme.spacing.unit * 2}px`,
  },
  highlighter: {
    color: theme.palette.secondary.main,
  }
});

class Feeds extends React.Component {
  state = {
    dense: false,
    secondary: false,
    allRequirements: [],
  };

  synchStateWithDB() {
    if (!this.mounted) return;
    var changes = db.allDocs({
      since: '0',
      include_docs: true,
      descending: true,
      limit: 10
    }).then((result) => {
      this.setState({
        allRequirements: result.rows.filter(r => !system_dbkeys.includes(r.key))
      })
    }).catch((err) => {
      console.log(err);
    });
  }

  componentDidMount() {
    this.mounted = true;
    this.synchStateWithDB();

    dbChangeListener= db.changes({
      since: 'now',
      live: true,
      include_docs: true
    }).on('change', (change) => {
      if (!system_dbkeys.includes(change.id)) {
        console.log(change);
        this.synchStateWithDB();
      }
    }).on('complete', function(info) {
      console.log(info);
    }).on('error', function (err) {
      console.log(err);
    });

  }

  componentWillUnmount() {
    this.mounted = false;
    dbChangeListener.cancel()
  }

  renderListItems() {
    const { dense, secondary, allRequirements } = this.state;
    const { classes, selectedProject } = this.props

    var listitems = null;
    if (allRequirements.length > 0) {
      listitems = allRequirements.map((r) => {
        var title = r.doc.project + ' ' + r.doc.reqid
        var icon = (r.doc.ltl || (r.doc.semantics && r.doc.semantics.ft !== constants.nonsense_semantics && r.doc.semantics.ft !== constants.undefined_semantics && r.doc.semantics.ft !== constants.unhandled_semantics))  ? null : <UnformalizedIcon color='error' />
        const highlighterStyle =  r.doc.project == selectedProject ? classes.highlighter : {}

        return(
        <ListItem key = {r.doc._id} disableGutters={false}>
          <ListItemText
            primary = {<span className={highlighterStyle}>{title}</span>}
            secondary= {r.doc.fulltext}
          />
          <ListItemSecondaryAction>
            <Tooltip id="tooltip-icon" title="Unformalized">
              <IconButton aria-label="Warning">
                {icon}
              </IconButton>
            </Tooltip>
          </ListItemSecondaryAction>
        </ListItem>
      )});
    }

    return(
      <List dense={true} >
        {listitems}
      </List>
    );
  }

  render() {
    const { classes } = this.props;

    return (
      <div className={classes.root}>
        <List className={classes.list}>
          {this.renderListItems()}
        </List>
      </div>
    );
  }
}

Feeds.propTypes = {
  classes: PropTypes.object.isRequired,
  selectedProject: PropTypes.string.isRequired
};

export default withStyles(styles)(Feeds);
