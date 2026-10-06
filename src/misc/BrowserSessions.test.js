import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import BrowserSessions from './BrowserSessions';

test('setup distinguishes its stopped browser from a ready browser on another channel', async () => {
  const sessions = [
    { id: 'a'.repeat(32), channel_id: 'current', name: 'Current browser', url: 'about:blank', resolution: '1920x1080', fps: 30, auto_match: true, running: false, health: 'unknown', controls_ready: false, input_url: 'rtmp://localhost/current' },
    { id: 'b'.repeat(32), channel_id: 'other', name: 'Other browser', running: true, health: 'healthy', controls_ready: true, input_url: 'rtmp://localhost/other' },
  ];
  const channels = [{channelid: 'current', name: 'Current', available: false}, {channelid: 'other', name: 'Recovered draft', available: false}];
  const restreamer = {
    ListChannels: () => channels,
    GetChannel: id => channels.find(c => c.channelid === id),
    RestoreBrowserChannels: jest.fn(),
    BrowserRequest: jest.fn(async path => {
      if (path === '/config') return {default_url: 'about:blank', max_workers: 2};
      if (path === '/sessions') return sessions;
      if (path === '/channels/current/session') return sessions[0];
      throw new Error('Unexpected browser request ' + path);
    }),
  };
  const onSelect = jest.fn();
  render(<BrowserSessions restreamer={restreamer} channelid="current" onSelect={onSelect} />);
  await screen.findByText("This channel's browser: Stopped");
  expect(screen.getByText(/Across all channels: 2 saved browser sessions. 1 active/)).toBeTruthy();
  expect(screen.getByText('Recovered draft: Ready - controls available')).toBeTruthy();
  expect(screen.getByRole('link', {name: 'Continue channel setup'}).getAttribute('href')).toBe('/ui/#/other/edit/wizard');
  await waitFor(() => expect(onSelect).toHaveBeenLastCalledWith(sessions[0]));
  expect(onSelect.mock.calls.some(([s]) => s?.id === sessions[1].id)).toBe(false);
  expect(screen.queryByRole('link', {name: 'Open browser controls'})).toBeNull();
});
