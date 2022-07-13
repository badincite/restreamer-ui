import React from 'react';

import { Trans } from '@lingui/macro';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';

import Select from '../../Select';

// Volume Filter
// http://ffmpeg.org/ffmpeg-all.html#volume

function init(initialState) {
	const state = {
		level: false,
		db: 0,
		...initialState,
	};

	return state;
}

function createMapping(settings) {
	const mapping = [];

	if (settings.level) {
		if (settings.level !== 'custom') {
			mapping.push(`volume=volume=${settings.level}`);
		} else {
			mapping.push(`volume=volume=${settings.db}dB`);
		}
	}

	return mapping;
}

function VolumeLevel(props) {
	return (
		<Select label={<Trans>Volume</Trans>} value={props.value} onChange={props.onChange}>
			<MenuItem value={false}>None</MenuItem>
			<MenuItem value={0.1}>10%</MenuItem>
			<MenuItem value={0.2}>20%</MenuItem>
			<MenuItem value={0.3}>30%</MenuItem>
			<MenuItem value={0.4}>40%</MenuItem>
			<MenuItem value={0.5}>50%</MenuItem>
			<MenuItem value={0.6}>60%</MenuItem>
			<MenuItem value={0.7}>70%</MenuItem>
			<MenuItem value={0.8}>80%</MenuItem>
			<MenuItem value={0.9}>90%</MenuItem>
			<MenuItem value={1.0}>100%</MenuItem>
			<MenuItem value="custom">Custom</MenuItem>
		</Select>
	);
}

VolumeLevel.defaultProps = {
	value: '',
	onChange: function (event) {},
};

function VolumeDB(props) {
	return (
		<TextField
			variant="outlined"
			fullWidth
			label={<Trans>Decibels (dB)</Trans>}
			type="number"
			value={props.value}
			disabled={props.disabled}
			onChange={props.onChange}
		/>
	);
}

VolumeDB.defaultProps = {
	value: '',
	disabled: false,
	onChange: function (event) {},
};

function Filter(props) {
	const settings = init(props.settings);

	const handleChange = (newSettings) => {
		let automatic = false;
		if (!newSettings) {
			newSettings = settings;
			automatic = true;
		}

		props.onChange(newSettings, createMapping(newSettings), automatic);
	};

	const update = (what) => (event) => {
		const newSettings = {
			...settings,
			[what]: event.target.value,
		};

		handleChange(newSettings);
	};

	React.useEffect(() => {
		handleChange(null);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<React.Fragment>
			<Grid item xs={6}>
				<VolumeLevel value={settings.level} onChange={update('level')} allowCustom />
			</Grid>
			<Grid item xs={6}>
				<VolumeDB value={settings.db} onChange={update('db')} disabled={settings.level !== 'custom'} allowCustom />
			</Grid>
		</React.Fragment>
	);
}

Filter.defaultProps = {
	settings: {},
	onChange: function (settings, mapping) {},
};

const filter = 'volume';
const name = 'Volume level';
const type = 'audio';
const hwaccel = false;

function summarize(settings) {
	return `${name}`;
}

function defaults() {
	const settings = init({});

	return {
		settings: settings,
		mapping: createMapping(settings),
	};
}

export { name, filter, type, hwaccel, summarize, defaults, Filter as component };