import React from 'react';
import { render, screen, fireEvent, waitFor } from '../utils/testing';
import BrowserControl from './BrowserControl';

test('full window controls authenticate, show a close header and close without stopping the browser', async () => {
  const session = {id: 'a'.repeat(32), name: 'Test channel', controls_ready: true, control_url: '/browser-control/test/'};
  const restreamer = { BrowserRequest: jest.fn(async () => ({})) };
  const onOpenChange = jest.fn();
  render(<BrowserControl restreamer={restreamer} session={session} onOpenChange={onOpenChange} />);
  fireEvent.click(screen.getByRole('button', {name: 'Open browser full screen'}));
  const frame = await screen.findByTitle('Full screen browser desktop');
  expect(frame.getAttribute('src')).toBe(session.control_url);
  expect(screen.getByRole('dialog').querySelector('.MuiToolbar-root')).toBeTruthy();
  const overlay = screen.getByRole('dialog').closest('.MuiDialog-root');
  expect(getComputedStyle(overlay).maxWidth).toBe('none');
  expect(getComputedStyle(overlay).width).toBe('100vw');
  expect(getComputedStyle(overlay).maxHeight).toBe('none');
  expect(getComputedStyle(overlay).padding).toBe('0px');
  expect(restreamer.BrowserRequest).toHaveBeenCalledWith('/control-session', 'POST', {});
  fireEvent.click(screen.getByRole('button', {name: 'Close browser controls'}));
  await waitFor(() => expect(screen.queryByTitle('Full screen browser desktop')).toBeNull());
  expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
  expect(restreamer.BrowserRequest.mock.calls.every(([path]) => path === '/control-session')).toBe(true);
});

test('channel shortcut selects only its own browser', async () => {
  const restreamer = {BrowserRequest: jest.fn(async () => [
    {id: 'other', channel_id: 'two', name: 'Other', controls_ready: true},
    {id: 'own', channel_id: 'one', name: 'Own', controls_ready: false},
  ])};
  render(<BrowserControl restreamer={restreamer} channelid="one" />);
  expect((await screen.findByRole('button', {name: 'Open browser full screen'})).disabled).toBe(true);
});
