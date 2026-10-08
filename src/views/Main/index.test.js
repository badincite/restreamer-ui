import React from 'react';
import { render, screen } from '../../utils/testing';
import Main from './index';
jest.mock('./Publication', () => () => null);
jest.mock('./Progress', () => () => null);
jest.mock('../../misc/BrowserControl', () => () => <div>Browser controls shortcut</div>);
jest.mock('../../misc/modals/Process', () => () => null);
jest.mock('../../misc/modals/Debug', () => () => null);
jest.mock('../Welcome', () => () => <div>New channel setup</div>);

test('saved disconnected channel stays accessible instead of reopening video setup', async () => {
 const restreamer = {
  SelectChannel: () => 'one', GetChannel: () => ({available: true, name: 'Saved browser channel'}),
  ConfigActive: () => ({}), GetIngestMetadata: async () => ({}),
  GetIngestProgress: async () => ({valid: false, state: 'disconnected', reconnect: -1}),
  GetChannelAddress: () => '', GetPublicAddress: () => '',
 };
 render(<Main restreamer={restreamer} />, {}, '/one', '/:channelid');
 await screen.findByText('Saved browser channel');
 expect(screen.getByText('Browser controls shortcut')).toBeTruthy();
 expect(screen.queryByText('New channel setup')).toBeNull();
});
