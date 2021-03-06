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
import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import Tooltip from '@material-ui/core/Tooltip';
import IconButton from '@material-ui/core/IconButton';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import Divider from '@material-ui/core/Divider';
import PropTypes from 'prop-types';
import ReactStars from 'react-stars'
import classNames from 'classnames';
import ReactMarkdown from 'react-markdown';
import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

import ThumbUp from '@material-ui/icons/ThumbUp';
import ThumbDown from '@material-ui/icons/ThumbDown';

import css from './Instructions.css';
import Help from './Help';
import ColorPicker from './ColorPicker';
import LTLSimDialog from './LTLSimDialog';

import {scopeInstruction, conditionInstruction, componentInstruction, timingInstruction, responseInstruction } from 'examples'

const instructions = {
  'scopeField' : scopeInstruction,
  'conditionField' : conditionInstruction,
  'componentField' : componentInstruction,
  'responseField' : responseInstruction,
  'timingField' :  timingInstruction
}

const constants = require('../parser/Constants');

const fieldsWithExplanation = ['scopeField', 'conditionField', 'componentField', 'responseField', 'timingField'];
const isDev = require('electron-is-dev');
const db = require('electron').remote.getGlobal('sharedObj').db;

var dbChangeListener = undefined;
const ltlsim = require('ltlsim-core').ltlsim;

const styles = theme => ({
  button: {
    margin: theme.spacing.unit,
  },
  leftIcon: {
    marginRight: theme.spacing.unit,
  },
  rightIcon: {
    marginLeft: theme.spacing.unit,
  },
  iconSmall: {
    fontSize: 12,
  },
  formula: {
    color: theme.palette.primary.main,
    fontFamily: 'Monospace',
    fontSize: 'medium'
  },
  description: {
    color: theme.palette.primary.main,
    fontFamily: 'sans-serif',
    fontSize: '14px'
  },
  variableDescription: {
    color: theme.palette.primary.main,
    fontFamily: 'sans-serif',
    fontSize: '14px',
    marginLeft: '7%'
  },
  bootstrapRoot: {
    padding: 0,
    'label + &': {
      marginTop: theme.spacing.unit * 3,
    },
  },
  bootstrapInput: {
    borderRadius: 4,
    backgroundColor: theme.palette.common.white,
    border: '1px solid #ced4da',
    padding: '10px',
    transition: theme.transitions.create(['border-color', 'box-shadow']),
    fontFamily: [
      '-apple-system',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    '&:focus': {
      borderColor: '#80bdff',
      boxShadow: '0 0 0 0.2rem rgba(0,123,255,.25)',
    },
  },
  bootstrapFormLabel: {
    fontSize: 18,
  },
  heading: {
    fontSize: theme.typography.pxToRem(15),
    fontWeight: theme.typography.fontWeightRegular
  },
});

class Instructions extends React.Component {
  constructor(props) {
    super(props);

    let status = ltlsim.check();

    /* Save to a member variable, not to the state, to have
    this independent from react updates */
    this.LTLSimStatus = status;

    this.state = {
      fieldColors : {},
      LTLSimDialogOpen: false
    };

    this.openLTLSimDialog = this.openLTLSimDialog.bind(this);
    this.closeLTLSimDialog = this.closeLTLSimDialog.bind(this);
  }

  componentWillUnmount() {
    this.mounted = false
    dbChangeListener.cancel()
  }

  componentDidMount = () => {
    this.mounted = true
    var notationPath = `../docs/_media/user-interface/examples/svgDiagrams/Notation.svg`;
    this.setState({
      notationUrl: notationPath
    })

    const db = require('electron').remote.getGlobal('sharedObj').db;
    db.get('FRET_PROPS').then((doc) => {
      this.setState({
        fieldColors: doc.fieldColors
      })
    }).catch((err) => {
      console.log(err)
    })
    dbChangeListener= db.changes({
      since: 'now',
      live: true,
      include_docs: true
    }).on('change', (change) => {
      if (change.id == 'FRET_PROPS') {
        if (this.mounted) {
          this.setState({
            fieldColors: change.doc.fieldColors,
          })
        }
      }
    }).on('complete', function(info) {
      console.log(info);
    }).on('error', function (err) {
      console.log(err);
    });
  }

  openDiagramNotationWindow = () => {
    window.open(this.state.notationUrl);
  }

  handleColorUpdate = (color) => {
    const fieldKey = this.props.field.toLowerCase().replace('field','')

    db.get('FRET_PROPS').then((doc) => {
      const updatedFieldColors = doc.fieldColors
      updatedFieldColors[fieldKey] = color.hex
      return db.put({
        _id: 'FRET_PROPS',
        _rev: doc._rev,
        fieldColors: updatedFieldColors
      });
    }).catch(function (err) {
      console.log(err);
    });

  }

  openLTLSimDialog() {
    this.setState({LTLSimDialogOpen: true});
  }

  closeLTLSimDialog() {
    this.setState({LTLSimDialogOpen: false});
  }

  renderFormula() {
    const { classes} = this.props;
    var { ft, description, diagram, type } = this.props.formalization.semantics;
    var path = `../docs/`+this.props.formalization.semantics.diagram;
    var notationPath = `../docs/_media/user-interface/examples/svgDiagrams/Notation.svg`;

    if (type === 'nasa'){
      /* TODO: Update, when replaceTemplateVarsWithArgs function gets updated
      to yield plain formulas instead of html beatified formulas. */
      let expression = this.props.formalization.semantics.ftExpanded
                          .replace(/<b>/g, "")
                          .replace(/<i>/g, "")
                          .replace(/<\/b>/g, "")
                          .replace(/<\/i>/g, "")
                          .replace(/\[<=(\d+)\s*\w+\s*\]/g, "[0, $1]")
                          .replace(/\[<(\d+)\s*\w+\s*\]/g, (str, p1, offset, s) => (`[0, ${p1-1}]`));

      var ltlsimLauncher = (this.LTLSimStatus.ltlsim && this.LTLSimStatus.nusmv) ?
        (<div>
            <Tooltip title="Launch interactive simulation" >
              <Button color="secondary" onClick={this.openLTLSimDialog}>
                Simulate
              </Button>
            </Tooltip>
            <LTLSimDialog
              open={this.state.LTLSimDialogOpen}
              id="REQ"
              expression={expression}
              onClose={this.closeLTLSimDialog}/>
          </div>) :
        (<Tooltip title={this.LTLSimStatus.ltlsim ?
          "Can't find a running NuSMV installation. Make sure to install NuSMV and add it to the PATH envinronment variable." :
          "Can't find a running ltlsim installation. Make sure to install ltlsim-core and NuSMV as described in the installation instructions."}>
          <div>
            <Button color="secondary" onClick={this.openLTLSimDialog} disabled>
              Simulate
            </Button>
            </div>
         </Tooltip>);
    }

    if ((ft !== constants.unhandled_semantics) && (ft !== constants.nonsense_semantics) && (ft !== constants.undefined_semantics) && (diagram !== constants.undefined_svg))
    return(
      <div>
      <br />
        <div className={classes.description} dangerouslySetInnerHTML={{ __html: this.props.formalization.semantics.description}} />
        <br />
        <div className={css.imgWrap}>
        <img src= {path}/>
        </div>
        <div className={classes.variableDescription} dangerouslySetInnerHTML={{ __html: this.props.formalization.semantics.diagramVariables}} />
        <br />
        <ExpansionPanel>
        <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
          <Typography className={classes.heading}>Diagram Semantics</Typography>
        </ExpansionPanelSummary>
        <ExpansionPanelDetails>
        <div className={css.notationWrap}>
        <img src= {notationPath}/>
        </div>
        </ExpansionPanelDetails>
      </ExpansionPanel>
        <br /><br />
        <Typography variant='subtitle1' color='primary'>
        Formalizations
        </Typography>
        <br />
        <ExpansionPanel>
        <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
          <Typography className={classes.heading}>Future Time LTL</Typography>
        </ExpansionPanelSummary>
        <ExpansionPanelDetails>
          <div>
            <div className={classes.formula} dangerouslySetInnerHTML={{ __html: this.props.formalization.semantics.ft }} />
            <br />
            <div className={classes.description} dangerouslySetInnerHTML={{ __html:' Target: '+ this.props.formalization.semantics.component + ' component.'}} />
          </div>
        </ExpansionPanelDetails>
      </ExpansionPanel>
      <ExpansionPanel>
        <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
          <Typography className={classes.heading}>Past Time LTL</Typography>
        </ExpansionPanelSummary>
        <ExpansionPanelDetails>
        <div>
          <div className={classes.formula} dangerouslySetInnerHTML={{ __html: this.props.formalization.semantics.pt}} />
          <br />
          <div className={classes.description} dangerouslySetInnerHTML={{ __html:' Target: '+ this.props.formalization.semantics.component + ' component.'}} />
        </div>
        </ExpansionPanelDetails>
      </ExpansionPanel>
      <br />
      {ltlsimLauncher}
      </div>)
      if ((ft !== constants.unhandled_semantics) && (ft !== constants.nonsense_semantics) && (ft !== constants.undefined_semantics) && (diagram === constants.undefined_svg))
      return(
        <div>
        <br />
          <div className={classes.description} dangerouslySetInnerHTML={{ __html: this.props.formalization.semantics.description}} />
          <br /><br />
          <Typography variant='subtitle1' color='primary'>
          Formalizations
          </Typography>
          <br />
          <ExpansionPanel>
          <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
            <Typography className={classes.heading}>Future Time LTL</Typography>
          </ExpansionPanelSummary>
          <ExpansionPanelDetails>
          <div>
            <div className={classes.formula} dangerouslySetInnerHTML={{ __html: this.props.formalization.semantics.ft}} />
            <br />
            <div className={classes.description} dangerouslySetInnerHTML={{ __html:' Target: '+ this.props.formalization.semantics.component + ' component.'}} />
          </div>
          </ExpansionPanelDetails>
        </ExpansionPanel>
        <ExpansionPanel>
          <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
            <Typography className={classes.heading}>Past Time LTL</Typography>
          </ExpansionPanelSummary>
          <ExpansionPanelDetails>
          <div>
            <div className={classes.formula} dangerouslySetInnerHTML={{ __html: this.props.formalization.semantics.pt}} />
            <br />
            <div className={classes.description} dangerouslySetInnerHTML={{ __html:' Target: '+ this.props.formalization.semantics.component + ' component.'}} />
          </div>
          </ExpansionPanelDetails>
        </ExpansionPanel>
        <br />
        {ltlsimLauncher}
        </div>)
    else if (ft === constants.undefined_semantics && diagram !== constants.undefined_svg)
    return(
      <div>
      <br />
        <div className={classes.description} dangerouslySetInnerHTML={{ __html: this.props.formalization.semantics.description}} />
        <br />
        <div className={css.imgWrap}>
        <img src= {path}/>
        </div>
        <div className={classes.variableDescription} dangerouslySetInnerHTML={{ __html: this.props.formalization.semantics.diagramVariables}} />
        <br />
        <ExpansionPanel>
        <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
          <Typography className={classes.heading}>Diagram Semantics</Typography>
        </ExpansionPanelSummary>
        <ExpansionPanelDetails>
        <div className={css.notationWrap}>
        <img src= {notationPath}/>
        </div>
        </ExpansionPanelDetails>
      </ExpansionPanel>
      </div>)
    else if ((ft === constants.undefined_semantics)&& diagram === constants.undefined_svg)
    return(
      <div>
        <br />
        <div className={classes.description} dangerouslySetInnerHTML={{ __html: constants.undefined_description_without_diagram}} />
      </div>)
    else if (ft === constants.unhandled_semantics || ft === constants.nonsense_semantics)
    return(
      <div>
        <br />
        <div className={classes.description} dangerouslySetInnerHTML={{ __html: this.props.formalization.semantics.description}} />
      </div>)
    else
      return(
        <div>
          <br /><br />
          <Typography variant='body1' color='primary'>Not Applicable</Typography>
        </div>)
  }

  ratingChanged = (newRating) => {
    console.log(newRating)
  }

  renderInstruction(field) {
    if (fieldsWithExplanation.includes(field)) {
      const mdsrc = instructions[field]
      return(
        <div>
          <ReactMarkdown source={mdsrc} />
          <ColorPicker
            initialColorInHex={this.state.fieldColors[field.replace('Field', '').toLowerCase()]}
            handleColorUpdate={this.handleColorUpdate} />
        </div>
      )
    }
    else if (field === 'semantics'){
      return(
        <div style={{display: 'block'}}>
          <Typography variant='h6' color='primary'>Semantics</Typography>
          <br />
          {this.renderFormula()}
          <br /><br />
          </div>
        )
    } else {
      return (
        <div>
          <Typography variant='h6' color='primary'>How to Use</Typography>
          <Help />
        </div>

      )
    }
  }
  render() {
     const {field} = this.props;
     return (
       <div className={css.divider}>
         {this.renderInstruction(field)}
       </div>
     );
   }
}

Instructions.propTypes = {
  field: PropTypes.string,
  grammarRule: PropTypes.string,
  formalization: PropTypes.object,
};

export default withStyles(styles)(Instructions);
