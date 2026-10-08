import React from 'react';
import { Alert, Checkbox, FormControlLabel, Grid, MenuItem, TextField, Typography } from '@mui/material';

export async function prepareBrowser(restreamer, channelid, form, progress, wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))) {
	progress('Saving settings and creating this channel’s browser…');
	let session = await restreamer.BrowserRequest(`/channels/${channelid}/session`, 'POST', form);
	const sessionid = session.id;
	if (!session.running) {
		await restreamer.BrowserRequest(`/sessions/${session.id}`, 'PATCH', form);
		progress('Starting the browser desktop…');
		await restreamer.BrowserRequest(`/sessions/${session.id}/start`, 'POST', {});
	}
	for (let attempt = 0; attempt < 90; attempt++) {
		progress('Waiting for the desktop and browser controls to become ready…');
		session = (await restreamer.BrowserRequest('/sessions')).find((s) => s.id === sessionid);
		if (!session) throw new Error('The browser session was removed. Return to setup and try again.');
		if (session.controls_ready && session.health === 'healthy') return session;
		if (session.health === 'unhealthy') throw new Error('Browser health check failed. Check Browser desktops, then retry.');
		await wait(2000);
	}
	throw new Error('Browser startup is taking longer than expected. You can retry without creating another session.');
}

export default function BrowserSetup({ restreamer, channelid, onSettings, onPrepare }) {
	const [form, setForm] = React.useState(null);
	const [running, setRunning] = React.useState(false);
	const [error, setError] = React.useState('');
	const callbacks = React.useRef({ onSettings, onPrepare });
	callbacks.current = { onSettings, onPrepare };
	React.useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const config = await restreamer.BrowserRequest('/config');
				const sessions = await restreamer.BrowserRequest('/sessions');
				const session = sessions.find((s) => s.channel_id === channelid);
				if (!mounted) return;
				setRunning(!!session?.running);
				setForm({ name: session?.name || restreamer.GetChannel(channelid)?.name || 'Browser desktop',
					url: session?.url || config.default_url || 'about:blank', resolution: session?.resolution || '1920x1080',
					fps: session?.fps || 30, auto_match: session?.auto_match ?? true, channel_id: channelid });
			} catch (e) { if (mounted) setError(e.message); }
		})();
		return () => { mounted = false; };
	}, [restreamer, channelid]);
	React.useEffect(() => {
		let valid = false;
		try { const url = new URL(form?.url); valid = !!form?.name?.trim() && (form.url === 'about:blank' || ['http:', 'https:'].includes(url.protocol)) && !url.username && !url.password; } catch (_) { /* Incomplete URL. */ }
		callbacks.current.onSettings(valid);
		callbacks.current.onPrepare((progress) => prepareBrowser(restreamer, channelid, form, progress));
	}, [form, restreamer, channelid]);
	if (error) return <Alert severity="error">{error}</Alert>;
	if (!form) return <Typography role="status">Loading browser settings…</Typography>;
	const change = (key) => (event) => setForm({ ...form, [key]: key === 'fps' ? Number(event.target.value) : event.target.value });
	return <Grid container spacing={2}>
		<Grid item xs={12}><Typography>Next automatically saves your settings, creates this channel’s browser and starts it. Startup progress appears on the next screen.</Typography></Grid>
		{running && <Grid item xs={12}><Alert severity="info">This channel’s browser is already running and will be reused. Manage or stop it from Browser desktops to change settings.</Alert></Grid>}
		<Grid item xs={12}><TextField fullWidth label="Name" value={form.name} disabled={running} onChange={change('name')} /></Grid>
		<Grid item xs={12}><TextField fullWidth label="Website URL" value={form.url} disabled={running} onChange={change('url')} /></Grid>
		<Grid item xs={6}><TextField fullWidth select label="Resolution" value={form.resolution} disabled={running} onChange={change('resolution')}>
			{['1280x720', '1920x1080'].map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
		</TextField></Grid>
		<Grid item xs={6}><TextField fullWidth select label="Capture FPS" value={form.fps} disabled={running} onChange={change('fps')}>
			{[24, 25, 30, 50, 60].map((fps) => <MenuItem key={fps} value={fps}>{fps}</MenuItem>)}
		</TextField></Grid>
		<Grid item xs={12}><FormControlLabel label="Automatically match playing video FPS (up to 60) and available bitrate measurements" control={<Checkbox checked={form.auto_match} disabled={running} onChange={(e) => setForm({ ...form, auto_match: e.target.checked })} />} /></Grid>
	</Grid>;
}
