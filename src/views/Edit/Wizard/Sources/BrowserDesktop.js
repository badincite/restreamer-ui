import React from 'react';
import Grid from '@mui/material/Grid';
import Icon from '@mui/icons-material/DesktopWindows';
import BrowserSetup from '../../../../misc/BrowserSetup';
import * as S from '../../Sources/Network';

function Source(props) {
	const source = (session) => {
		const config = S.func.initConfig(props.config);
		const settings = S.func.initSettings({ mode: 'pull', address: session?.input_url || '', browser_session: session?.id || '' }, config);
		return { type: S.id, settings, inputs: session ? S.func.createInputs(settings, config, S.func.initSkills(props.skills)) : [], ready: true };
	};
	return <Grid item xs={12}><BrowserSetup restreamer={props.restreamer} channelid={props.channelid}
		onSettings={(valid) => { const s = source(null); props.onChange(s.type, s.settings, s.inputs, valid); }}
		onPrepare={(prepare) => props.onPrepare(async (progress) => source(await prepare(progress)))} /></Grid>;
}
const id = 'browser';
const type = 'network';
const name = 'Browser desktop';
const capabilities = ['audio', 'video'];
export { id, type, name, capabilities, Icon as icon, Source as component };
