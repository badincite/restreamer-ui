import React from 'react';

import { Trans } from '@lingui/macro';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

import Paper from '../../../misc/Paper';
import PaperHeader from '../../../misc/PaperHeader';

export default function Probe(props) {
	return (
		<Paper xs={12} md={5} marginBottom="6em" className="PaperM">
			<PaperHeader spacing={2} variant="h1" onAbort={props.onAbort} />
			<Grid container justifyContent="center" spacing={2} align="center">
				<Grid item xs={12}>
					{!props.error && <CircularProgress color="inherit" />}
				</Grid>
				<Grid item xs={12}>
					<Typography textAlign="center">
						{props.message || <Trans>Please wait. Probe stream data ...</Trans>}
					</Typography>
					{props.error && <><Typography color="error">{props.error}</Typography><Button onClick={props.onRetry}>Retry</Button><Button onClick={props.onBack}>Back to settings</Button></>}
				</Grid>
			</Grid>
		</Paper>
	);
}

Probe.defaultProps = {
	onAbort: () => {},
};
