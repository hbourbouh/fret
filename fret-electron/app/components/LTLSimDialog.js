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
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Tooltip from '@material-ui/core/Tooltip';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import Slide from '@material-ui/core/Slide';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import CloseIcon from '@material-ui/icons/Close';
import FormulaEvaluationIcon from '@material-ui/icons/Highlight';


import TimeSeriesWidget from './TimeSeriesWidget';
import FormulaDetails from './FormulaDetails';

const ltlsim = require('ltlsim-core').ltlsim;
const LTLSimController = require('ltlsim-core').LTLSimController;
const EFormulaStates = require('ltlsim-core').EFormulaStates;


const styles = theme => ({
  appBar: {
    position: 'relative',
  },
  flex: {
    flex: 1,
  }
});

function Transition(props) {
    return <Slide direction="right" {...props} />;
}


class LTLSimDialog extends Component {

    constructor(props) {
        super(props);

        const traceLength = 40;
        let model = LTLSimController.init(traceLength);
        LTLSimController.addFormula(model, props.id, props.expression);

        this.state = {
            model,
            visibleSubformulas: [],
            highlight: true
        }

        this.handleClickHighlight = this.handleClickHighlight.bind(this);
        this.handleLtlsimResult = this.handleLtlsimResult.bind(this);
        this.handleLtlsimSimulate = this.handleLtlsimSimulate.bind(this);
        this.handleTraceDataChange = this.handleTraceDataChange.bind(this);
        this.handleTraceLengthChange = this.handleTraceLengthChange.bind(this);
        this.update = this.update.bind(this);
    }

    componentDidUpdate(prevProps) {

        let { model } = this.state;
        let  traceLength  = LTLSimController.getTraceLength(model);
        /* If label or expression changed, initialize a new model */
        if (this.props.id !== prevProps.id || this.props.expression !== prevProps.expression) {
            model = LTLSimController.init(traceLength);
            LTLSimController.addFormula(model, this.props.id, this.props.expression);
            this.setState({model});
        }

        /* If the dialog just became visible and the formula has a valid expression,
        simulate the formula if required (checked by this.update()) */
        let formula = LTLSimController.getFormula(model, this.props.id);
        if (this.props.open && !prevProps.open &&
            formula && formula.parseErrors.length === 0) {
            this.update();
        }

    }

    handleClickHighlight() {
        this.setState((prevState) => ({
            highlight: prevState.highlight ? false : true
        }));
    }

    handleTraceDataChange(dataKey, dataIdx, trace) {
        this.setState((prevState) => {
            let { model } = prevState;
            const { id } = this.props;
            LTLSimController.setAtomicTrace(model, dataKey, trace);

            /* Change value of the affected formula */
            LTLSimController.setFormulaValue(model, id, "", EFormulaStates.UNKNOWN);
            let formula = LTLSimController.getFormula(model, id);
            if (formula) {
                formula.subexpressions.forEach((s, i) => {
                    LTLSimController.setFormulaValue(model, id, i, EFormulaStates.UNKNOWN);
                })
            }

            return {
                model
            };
        }, () => {
            /* Call LTL simulation after the state was updated */
            this.update();
        });
    }

    handleTraceLengthChange(traceLength) {
        this.setState((prevState) => {
            let {model} = prevState;
            const { id } = this.props;
            LTLSimController.setTraceLength(model, traceLength);

            /* Set the formula value to unknown */
            LTLSimController.setFormulaValue(model, id, "", EFormulaStates.UNKNOWN);
            let formula = LTLSimController.getFormula(model, id);
            if (formula) {
                formula.subexpressions.forEach((s, i) => {
                    LTLSimController.setFormulaValue(model, id, i, EFormulaStates.UNKNOWN);
                })
            }
            return {
                model
            };
        }, () => {
            /* Call LTL simulation after the state was updated */
            this.update();
        });
    }

    handleLtlsimSimulate() {
        this.setState((prevState) => {
            let { model, visibleSubformulas } = prevState;
            const { id } = this.props;

            /* Set the simulated formula and subformulas to busy */
            LTLSimController.setFormulaValue(model, id, "", EFormulaStates.BUSY);
            let formula = LTLSimController.getFormula(model, id);
            if (formula) {
                formula.subexpressions.forEach((s, i) => {
                    LTLSimController.setFormulaValue(model, id, i, EFormulaStates.BUSY);
                })
            }

            /* Filter for simulate method */
            let filter = {
                label: id,
                subexpressions: visibleSubformulas
            }

            ltlsim.simulate(
                model,
                filter,
                true,
                this.handleLtlsimResult,
                undefined,
                undefined);

                return {
                    model
                };
        })
    }

    handleLtlsimResult(id, sid, value, trace) {
        this.setState((prevState) => {
            let {model} = prevState;
            if (LTLSimController.getFormulaKeys(model).indexOf(id) !== -1) {
                LTLSimController.setFormulaTrace(model, id, sid, trace);
                LTLSimController.setFormulaValue(model, id, sid, value ?
                                                    EFormulaStates.VALIDATED :
                                                    EFormulaStates.VIOLATED);
                return { model };
            } else {
                return prevState;
            }
        })
    }

    update() {
        let { model, visibleSubformulas } = this.state;
        const { id } = this.props;
        let formula = LTLSimController.getFormula(model, id);
        let doUpdate = false;
        if (formula !== undefined && formula !== null && formula.parseErrors.length === 0) {
            if (formula.value === EFormulaStates.UNKNOWN ||
                formula.value === EFormulaStates.BUSY ) {
                doUpdate = true;
            } else {
                doUpdate = formula.subexpressions
                                .filter((s, i) => (visibleSubformulas.indexOf(i) !== -1))
                                .some((s) => (s.value === EFormulaStates.UNKNOWN ||
                                                s.value === EFormulaStates.BUSY));
            }
        }
        if (doUpdate) {
            this.handleLtlsimSimulate();
        }
    }

    render () {
        const { classes, open, id, expression, onClose } = this.props;
        let { model, traceLength, visibleSubformulas, highlight } = this.state;
        let formula = LTLSimController.getFormula(model, id);

        if (formula !== undefined && formula !== null) {
            return (
                <Dialog
                    open={open}
                    fullScreen
                    TransitionComponent={Transition}>
                    <AppBar className={classes.appBar}>
                    <Toolbar>
                    <Typography
                        variant="h6"
                        color="inherit"
                        noWrap
                        className={classes.flex}>
                        LTLSIM
                    </Typography>
                    <Tooltip title={highlight ?
                        "Turn off formula highlight (colors the formula according to the overall valuation)" :
                        "Turn on formula highlight (colors the formula according to the overall valuation)"} >
                        <IconButton
                            color={highlight ? "secondary" : "inherit"}
                            onClick={this.handleClickHighlight}>
                            <FormulaEvaluationIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Close simulation window" >
                        <IconButton
                            color="inherit"
                            onClick={onClose}
                            aria-label="Close">
                            <CloseIcon />
                        </IconButton>
                    </Tooltip>
                    </Toolbar>
                </AppBar>
                    {LTLSimController.getFormulaKeys(model).length > 0 &&
                        <TimeSeriesWidget
                            model={model}
                            visibleAtomics={LTLSimController.getAtomicKeys(model)}
                            visibleFormulas={LTLSimController.getFormulaKeys(model)}
                            visibleSubformulas={{[id]: visibleSubformulas}}
                            traceLength={LTLSimController.getTraceLength(model)}
                            onChange={this.handleTraceDataChange}
                            onTraceLengthChange={this.handleTraceLengthChange}
                            displayFormulaEvaluation={highlight}
                            displayAtomicsWithFormulas={false}
                            displaySubformulas={true}
                            selectedFormula=""
                        />}
                    <FormulaDetails
                        fkey={id}
                        model={model}
                        actions={false}
                    />
                </Dialog>
            )} else {
                return null;
            }
    }
}

LTLSimDialog.propTypes = {
    classes: PropTypes.object.isRequired,
    open: PropTypes.bool.isRequired,
    id: PropTypes.string.isRequired,
    expression: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired
};

export default withStyles(styles)(LTLSimDialog)
