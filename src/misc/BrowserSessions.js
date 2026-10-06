import React from 'react';
import { Alert, Box, Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Grid, LinearProgress, MenuItem, TextField, Typography } from '@mui/material';

const initial = { name: 'Browser desktop', url: 'about:blank', resolution: '1920x1080', fps: 30, auto_match: true, channel_id: '' };

export default function BrowserSessions({ restreamer, channelid = '', initialSession = '', onSelect }) {
	const [sessions, setSessions] = React.useState([]);
	const [selected, setSelected] = React.useState(initialSession);
	const [form, setForm] = React.useState({ ...initial, channel_id: channelid });
	const [error, setError] = React.useState('');
	const [busy, setBusy] = React.useState(false);
	const [operation, setOperation] = React.useState('');
	const [capacityError, setCapacityError] = React.useState('');
	const [deleteOpen, setDeleteOpen] = React.useState(false);
	const [controlReady, setControlReady] = React.useState(false);
	const [controlKey, setControlKey] = React.useState(0);
	const [controlError, setControlError] = React.useState(false);
	const [max, setMax] = React.useState(0);
	const callback = React.useRef(onSelect);
	const selectedRef = React.useRef(selected);
	selectedRef.current = selected;
	const hydrated = React.useRef('');
	const defaultUrl = React.useRef(initial.url);
	callback.current = onSelect;
	const session = sessions.find((s) => s.id === selected);
	const active = sessions.filter((s) => s.running || ['running', 'restarting', 'paused'].includes(s.status));
	const otherActive = active.filter((s) => s.channel_id !== channelid);
	const capacityBlocked = max > 0 && !!session && !session.running && active.length >= max;
	const channelName = (s) => {
		const channel = restreamer.ListChannels().find((c) => c.channelid === s.channel_id);
		return channel?.name || (s.channel_id ? `channel ${s.channel_id.slice(0, 8)}` : 'standalone session');
	};
	const associatedChannel = session && restreamer.ListChannels().find((c) => c.channelid === session.channel_id);

	React.useEffect(() => {
		let mounted = true;
		const refresh = async () => {
			try {
				const list = await restreamer.BrowserRequest('/sessions');
				if (mounted) {
					restreamer.RestoreBrowserChannels(list);
					setSessions(list);
				}
			} catch (e) { if (mounted) setError(e.message); }
		};
		(async () => {
			if (channelid) setBusy(true);
			try {
				const config = await restreamer.BrowserRequest('/config');
				if (mounted) {
					defaultUrl.current = config.default_url;
					if (!selectedRef.current) setForm((f) => ({ ...f, url: config.default_url }));
					setMax(config.max_workers);
				}
				if (channelid) {
					const saved = await restreamer.BrowserRequest(`/channels/${channelid}/session`, 'POST', {
						name: restreamer.GetChannel(channelid)?.name || 'Browser desktop',
					});
					if (mounted) setSelected(saved.id);
				}
				await refresh();
			} catch (e) { if (mounted) setError(e.message); }
			finally { if (mounted) setBusy(false); }
		})();
		const timer = setInterval(refresh, 5000);
		return () => { mounted = false; clearInterval(timer); };
	}, [restreamer, channelid]);

	React.useEffect(() => {
		// Hydrate a session restored by the channel wizard once, without
		// overwriting unsaved edits whenever the status poll refreshes.
		if (session && hydrated.current !== selected) {
			setForm(Object.fromEntries(Object.keys(initial).map((k) => [k, session[k]])));
			hydrated.current = selected;
		}
	}, [session, selected]);

	React.useEffect(() => {
		callback.current?.(session && (!channelid || session.channel_id === channelid) ? session : null);
		// Notify only when source/readiness changes, not on every parent render.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selected, channelid, session?.channel_id, session?.running, session?.health, session?.controls_ready, session?.input_url]);

	React.useEffect(() => {
		let mounted = true;
		setControlReady(false);
		setControlError(false);
		if (!session?.controls_ready) return () => { mounted = false; };
		const renew = async () => {
			try {
				await restreamer.BrowserRequest('/control-session', 'POST', {});
				if (mounted) setControlReady(true);
			} catch (e) { if (mounted) { setControlReady(false); setError(e.message); } }
		};
		renew();
		const timer = setInterval(renew, 30000);
		return () => { mounted = false; clearInterval(timer); };
	}, [restreamer, selected, session?.controls_ready]);

	const retryControls = async () => {
		try {
			await restreamer.BrowserRequest('/control-session', 'POST', {});
			setControlReady(true); setControlError(false); setControlKey((k) => k + 1);
		} catch (e) { setError(e.message); }
	};
	const controlLoaded = (event) => {
		// A startup/proxy error is JSON, not a desktop. Offer a clean retry.
		try { setControlError(event.target.contentDocument?.contentType === 'application/json'); }
		catch (_) { setControlError(true); }
	};
	React.useEffect(() => {
		if (!controlError || !session?.controls_ready) return undefined;
		const timer = setTimeout(retryControls, 5000);
		return () => clearTimeout(timer);
		// Retry a transient error frame without requiring a page reload.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [controlError, session?.controls_ready, selected, restreamer]);

	const choose = (id) => {
		setError(''); setCapacityError('');
		setSelected(id);
		hydrated.current = id;
		const s = sessions.find((s) => s.id === id);
		if (s) setForm(Object.fromEntries(Object.keys(initial).map((k) => [k, s[k]])));
		else setForm({ ...initial, url: defaultUrl.current, channel_id: channelid });
	};
	const update = (key) => (event) => setForm({ ...form, [key]: key === 'fps' ? Number(event.target.value) : event.target.value });
	const run = async (action, target = selected) => {
		if (action === 'start' && capacityBlocked) return;
		setBusy(true); setOperation(action); setError(''); setCapacityError('');
		try {
			if (action === 'create' || action === 'save') {
				const s = await restreamer.BrowserRequest(action === 'create' ? '/sessions' : '/sessions/' + selected,
					action === 'create' ? 'POST' : 'PATCH', { ...form, channel_id: channelid || form.channel_id });
				setSelected(s.id);
			} else await restreamer.BrowserRequest(`/sessions/${target}/${action}`, 'POST', {});
			setSessions(await restreamer.BrowserRequest('/sessions'));
		} catch (e) {
			if (action === 'start' && e.status === 409 && e.message.startsWith('Maximum')) {
				setCapacityError('This browser was not started: all browser slots are in use. Stop an active browser to free a slot.');
				try { setSessions(await restreamer.BrowserRequest('/sessions')); } catch (_) { /* Keep the useful capacity message. */ }
			} else setError(e.message);
		}
		finally { setBusy(false); setOperation(''); }
	};
	const locked = busy || !!session?.running;
	const deleteSelected = async () => {
		setBusy(true); setOperation('delete'); setError('');
		try {
			if (associatedChannel) {
				if (!(await restreamer.DeleteChannel(session.channel_id))) throw new Error('Channel/browser deletion failed; please retry.');
			} else await restreamer.BrowserRequest(`/sessions/${selected}`, 'DELETE');
			setSelected(''); hydrated.current = ''; setForm({ ...initial, url: defaultUrl.current, channel_id: channelid });
			setSessions(await restreamer.BrowserRequest('/sessions'));
			setDeleteOpen(false); setCapacityError('');
			if (channelid) window.location.hash = '#/browsers';
		} catch (e) { setError(e.message); setDeleteOpen(false); }
		finally { setBusy(false); setOperation(''); }
	};
	const starting = !!session?.running && !session?.controls_ready;
	const status = (s) => !s.running ? 'Stopped' : s.controls_ready ? 'Ready - controls available' : s.health === 'unhealthy' ? 'Not ready - health check failing' : 'Starting - preparing browser controls';
	return <Grid container spacing={2}>
		{channelid && <Grid item xs={12}><Button component="a" href="/ui/#/browsers" variant="outlined">Manage all browser sessions</Button></Grid>}
		<Grid item xs={12}>
			{channelid && <Typography role="status">This channel's browser: {session ? status(session) : 'Loading...'}</Typography>}
			<Typography>{channelid ? 'Across all channels: ' : ''}{sessions.length} saved browser sessions. {max > 0 ? `${active.length} active / ${max} allowed at once.` : `${active.length} active. No application session cap; GPU/driver and host capacity still apply.`}</Typography>
			<Typography variant="body2">Stopped sessions do not use an active slot. Stop retains a session for reuse; deleting its channel removes the browser container and session. New browsers are created from channel Video setup.</Typography>
		</Grid>
		{error && <Grid item xs={12}><Alert severity="error">{error}</Alert></Grid>}
		{channelid && otherActive.length > 0 && <Grid item xs={12}><Alert severity="info">
			Other channels have running browsers. Continue their setup below, or start this channel's own browser.
			{otherActive.map((s) => {
				const owner = restreamer.GetChannel(s.channel_id);
				return <Box key={s.id} sx={{ mt: 1 }}><Typography>{channelName(s)}: {status(s)}</Typography>
					{owner && <Button component="a" href={`/ui/#/${s.channel_id}${owner.available ? '' : '/edit/wizard'}`} variant="outlined" size="small">
						{owner.available ? 'Open channel' : 'Continue channel setup'}
					</Button>}
				</Box>;
			})}
		</Alert></Grid>}
		<Grid item xs={12}><TextField select fullWidth label={channelid ? "This channel's browser" : 'Browser session'} value={selected} onChange={(e) => choose(e.target.value)}>
			{!channelid && <MenuItem value="">Select a browser channel</MenuItem>}
			{sessions.filter((s) => !channelid || s.channel_id === channelid).map((s) => <MenuItem key={s.id} value={s.id}>{s.name} — {channelName(s)} ({s.id.slice(0, 6)}) — {status(s)}</MenuItem>)}
		</TextField></Grid>
		{!channelid && associatedChannel && !associatedChannel.available && <Grid item xs={12}><Alert severity="info">
			This browser belongs to an unfinished channel. Continue setup to connect its feed to Restreamer.
			<Box sx={{ mt: 1 }}><Button component="a" href={`/ui/#/${session.channel_id}/edit/wizard`} variant="contained">Continue channel setup</Button></Box>
		</Alert></Grid>}
		{(capacityBlocked || capacityError) && <Grid item xs={12}><Alert severity="warning">
			<Typography role="status">{capacityError || `Not started: ${active.length}/${max} browser slots are already in use.`}</Typography>
			Stop one of the active browsers below, or delete its channel, then start this browser. Nothing will be stopped automatically.
			{active.map((s) => <Box key={s.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
				<Typography>{s.name} — {channelName(s)} ({s.id.slice(0, 6)})</Typography>
				<Button size="small" variant="outlined" disabled={busy} onClick={() => run('stop', s.id)}>Stop this browser</Button>
			</Box>)}
		</Alert></Grid>}
		{busy && <Grid item xs={12}><LinearProgress /><Typography role="status">{operation === 'start' ? 'Starting browser: sending the start request...' : operation === 'stop' ? 'Stopping browser: freeing its slot...' : 'Applying browser operation...'}</Typography></Grid>}
		{starting && <Grid item xs={12}><Alert severity={session.health === 'unhealthy' ? 'warning' : 'info'} icon={<CircularProgress size={20} />}>
			<Typography role="status">{session.health === 'unhealthy' ? 'Browser is not ready yet. Its health check is failing.' : 'Starting browser: preparing the GPU desktop, audio and stream.'}</Typography>
			Controls will open automatically when ready. This screen refreshes every 5 seconds; no page reload is needed. You can stop the browser if startup does not complete.
		</Alert><LinearProgress /></Grid>}
		{session?.controls_ready && <Grid item xs={12}>
			<Alert severity="success">Browser ready. Use the embedded desktop below to navigate, log in and play video.</Alert>
			<Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
				<Button component="a" href={session.control_url} target="_blank" rel="noopener" variant="contained" disabled={!controlReady}>Open browser controls</Button>
				<Button variant="outlined" onClick={retryControls}>Reconnect controls</Button>
			</Box>
		</Grid>}
		<Grid item xs={12}><TextField fullWidth label="Name" value={form.name} onChange={update('name')} disabled={locked} /></Grid>
		<Grid item xs={12}><TextField fullWidth label="Website URL" value={form.url} onChange={update('url')} disabled={locked} helperText="Starting website. Stop the browser before changing saved settings." /></Grid>
		<Grid item xs={6}><TextField select fullWidth label="Resolution" value={form.resolution} onChange={update('resolution')} disabled={locked}>
			<MenuItem value="1920x1080">1920×1080 (1080p)</MenuItem><MenuItem value="1280x720">1280×720 (720p)</MenuItem>
		</TextField></Grid>
		<Grid item xs={6}><TextField select fullWidth label="Capture FPS" value={form.fps} onChange={update('fps')} disabled={locked}>
			{[24, 25, 30, 50, 60].map((fps) => <MenuItem key={fps} value={fps}>{fps}</MenuItem>)}
		</TextField></Grid>
		<Grid item xs={12}><FormControlLabel control={<Checkbox checked={form.auto_match} disabled={locked} onChange={(e) => setForm({ ...form, auto_match: e.target.checked })} />} label="Automatically match playing video FPS (up to 60) and available bitrate measurements" /></Grid>
		<Grid item xs={12}><Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
			<Button variant="outlined" disabled={locked || !selected} onClick={() => run('save')}>Save settings</Button>
			{selected && <><Button variant="outlined" disabled={busy || session?.running || capacityBlocked} onClick={() => run('start')}>{operation === 'start' ? 'Starting browser...' : capacityBlocked ? 'Start unavailable - limit reached' : 'Start browser'}</Button>
			<Button variant="outlined" disabled={busy || !session?.running} onClick={() => run('stop')}>Stop browser</Button>
			<Button variant="outlined" color="error" disabled={busy} onClick={() => setDeleteOpen(true)}>{associatedChannel ? 'Delete channel and browser' : 'Delete saved browser'}</Button></>}
		</Box></Grid>
		<Dialog open={deleteOpen} onClose={() => !busy && setDeleteOpen(false)}>
			<DialogTitle>{associatedChannel ? 'Delete channel and browser?' : 'Delete saved browser?'}</DialogTitle>
			<DialogContent>{associatedChannel ? `This deletes channel "${associatedChannel.name}" and its browser.` : `This removes saved browser "${session?.name}" and its container.`} Any running browser will be stopped. Saved login profiles will remain on disk for recovery.</DialogContent>
			<DialogActions><Button disabled={busy} onClick={() => setDeleteOpen(false)}>Cancel</Button><Button color="error" disabled={busy} onClick={deleteSelected}>{busy ? 'Deleting...' : 'Delete'}</Button></DialogActions>
		</Dialog>
		{session && <Grid item xs={12}><Typography variant="caption">{session.resolution} · CPU decode · NVIDIA rendering / NVENC encoding. Container health is not proof of video playback. Next probes the RTMP feed.</Typography></Grid>}
		{session?.controls_ready && controlReady && <Grid item xs={12}>
			{controlError && <Alert severity="warning" action={<Button onClick={retryControls}>Retry</Button>}>Controls temporarily unavailable. Reconnect to reload the desktop.</Alert>}
			<Box component="iframe" key={selected + ':' + controlKey} title="Browser desktop controls" src={session.control_url} onLoad={controlLoaded} allow="fullscreen" sx={{ width: '100%', height: 500, border: 0 }} />
		</Grid>}
	</Grid>;
}
