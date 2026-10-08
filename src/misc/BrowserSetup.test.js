import React from 'react';
import { render, screen, waitFor } from '../utils/testing';
import BrowserSetup, { prepareBrowser } from './BrowserSetup';

test('setup loads settings without creating a container or showing management actions', async () => {
 const restreamer = { GetChannel: () => ({name: 'Channel'}), BrowserRequest: jest.fn(async (path) => path === '/config' ? {default_url: 'about:blank'} : []) };
 const onSettings = jest.fn();
 render(<BrowserSetup restreamer={restreamer} channelid="one" onSettings={onSettings} onPrepare={() => {}} />);
 await screen.findByLabelText('Website URL');
 await waitFor(() => expect(onSettings).toHaveBeenLastCalledWith(true));
 expect(screen.queryByRole('button')).toBeNull();
 expect(restreamer.BrowserRequest.mock.calls.every((call) => call.length === 1)).toBe(true);
});

test('Next saves and starts the owning session and waits for readiness', async () => {
 let polls = 0;
 const session = {id: 'own', running: false};
 const restreamer = {BrowserRequest: jest.fn(async (path) => {
  if (path.includes('/channels/')) return session;
  if (path === '/sessions') return [{...session, running: true, controls_ready: ++polls > 1, health: 'healthy'}];
  return {};
 })};
 const progress = jest.fn(), wait = jest.fn(async () => {}), form = {url: 'about:blank'};
 const result = await prepareBrowser(restreamer, 'one', form, progress, wait);
 expect(result.controls_ready).toBe(true);
 expect(restreamer.BrowserRequest).toHaveBeenCalledWith('/sessions/own', 'PATCH', form);
 expect(restreamer.BrowserRequest).toHaveBeenCalledWith('/sessions/own/start', 'POST', {});
 expect(wait).toHaveBeenCalledTimes(1);
});

test('retry reuses a running browser without resetting settings or starting it twice', async () => {
 const session = {id: 'own', running: true, controls_ready: true, health: 'healthy'};
 const restreamer = {BrowserRequest: jest.fn(async (path) => path === '/sessions' ? [session] : session)};
 await prepareBrowser(restreamer, 'one', {}, () => {});
 expect(restreamer.BrowserRequest.mock.calls).toHaveLength(2);
});
