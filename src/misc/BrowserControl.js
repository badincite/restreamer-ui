import React from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, Toolbar, Typography } from '@mui/material';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import CloseIcon from '@mui/icons-material/Close';

export default function BrowserControl({ restreamer, channelid = '', session: suppliedSession, onOpenChange }) {
  const [found, setFound] = React.useState(null);
  const [open, setOpen] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState('');
  const [reload, setReload] = React.useState(0);
  const session = suppliedSession === undefined ? found : suppliedSession;
  const callback = React.useRef(onOpenChange);
  callback.current = onOpenChange;

  React.useEffect(() => {
    if (suppliedSession !== undefined || !channelid) return undefined;
    let mounted = true;
    const refresh = async () => {
      try {
        const sessions = await restreamer.BrowserRequest('/sessions');
        if (mounted) setFound(sessions.find(s => s.channel_id === channelid) || null);
      } catch (_) { if (mounted) setFound(null); }
    };
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => { mounted = false; clearInterval(timer); };
  }, [restreamer, channelid, suppliedSession]);

  React.useEffect(() => {
    if (!open) return undefined;
    let mounted = true;
    setReady(false); setError('');
    const renew = async () => {
      try {
        await restreamer.BrowserRequest('/control-session', 'POST', {});
        if (mounted) { setReady(true); setError(''); }
      } catch (e) { if (mounted) { setReady(false); setError(e.message); } }
    };
    renew();
    const timer = setInterval(renew, 30000);
    return () => { mounted = false; clearInterval(timer); };
  }, [open, restreamer, session?.id, reload]);

  const changeOpen = value => { setOpen(value); callback.current?.(value); };
  const frameLoaded = event => {
    try {
      if (event.target.contentDocument?.contentType === 'application/json') {
        setError('Browser controls are temporarily unavailable. Reconnect to try again.');
      }
    } catch (_) { setError('Could not load browser controls. Reconnect to try again.'); }
  };
  if (!session && !open) return null;
  return <>
    <Button variant="outlined" startIcon={<FullscreenIcon />} disabled={!session?.controls_ready} onClick={() => changeOpen(true)}>
      Open browser full screen
    </Button>
    <Dialog fullScreen open={open} onClose={() => changeOpen(false)} aria-label="Full screen browser controls"
      PaperProps={{ sx: { display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: '#111' } }}>
      <Toolbar sx={{ flexShrink: 0, gap: 1, bgcolor: 'background.paper', flexWrap: 'wrap' }}>
        <Typography sx={{ flex: 1 }}>Browser controls — {session?.name || 'Browser desktop'}</Typography>
        <Button onClick={() => setReload(n => n + 1)}>Reconnect</Button>
        <Button variant="outlined" startIcon={<CloseIcon />} onClick={() => changeOpen(false)}>Close browser controls</Button>
      </Toolbar>
      {error && <Alert severity="warning">{error}</Alert>}
      {!session?.controls_ready ? <Alert severity="info">This browser is stopped or starting. Close this view to return to its settings.</Alert>
        : ready ? <Box component="iframe" key={session.id + ':' + reload} title="Full screen browser desktop" src={session.control_url}
          onLoad={frameLoaded} allow="fullscreen; clipboard-read; clipboard-write" sx={{ flex: 1, minHeight: 0, width: '100%', border: 0 }} />
          : !error && <Box sx={{ p: 3 }}><CircularProgress aria-label="Connecting browser controls" /></Box>}
    </Dialog>
  </>;
}
