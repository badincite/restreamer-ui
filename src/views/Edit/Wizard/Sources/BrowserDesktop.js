import React from 'react';
import Grid from '@mui/material/Grid';
import Icon from '@mui/icons-material/DesktopWindows';
import BrowserSessions from '../../../../misc/BrowserSessions';
import * as S from '../../Sources/Network';

function Source(props) {
	const handleSelect = (session) => {
		const config = S.func.initConfig(props.config);
		const settings = S.func.initSettings({ mode: 'pull', address: session?.input_url || '', browser_session: session?.id || '' }, config);
		props.onChange(S.id, settings, session ? S.func.createInputs(settings, config, S.func.initSkills(props.skills)) : [],
			!!session?.controls_ready && session?.health === 'healthy');
	};
	return <Grid item xs={12}><BrowserSessions restreamer={props.restreamer} channelid={props.channelid}
		initialSession={props.settings?.browser_session} onSelect={handleSelect} /></Grid>;
}
const id = 'browser';
const type = 'network';
const name = 'Browser desktop';
const capabilities = ['audio', 'video'];
export { id, type, name, capabilities, Icon as icon, Source as component };
