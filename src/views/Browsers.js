import React from 'react';
import Paper from '../misc/Paper';
import PaperHeader from '../misc/PaperHeader';
import BrowserSessions from '../misc/BrowserSessions';

export default function Browsers({ restreamer }) {
	return <Paper xs={12} md={10}><PaperHeader title="Browser desktops" /><BrowserSessions restreamer={restreamer} /></Paper>;
}
