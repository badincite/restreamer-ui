import React from 'react';
import { render, screen, fireEvent } from '../utils/testing';
import ChannelList from './ChannelList';

test('the selected channel stays clickable when navigating back from Browser desktops', async () => {
  const onClick = jest.fn();
  render(<ChannelList open channelid="one" channels={[{channelid: 'one', id: 'ingest-one', name: 'Test channel', thumbnail: ''}]}
    onClick={onClick} onState={async () => ({'ingest-one': 'connected'})} />);
  const channel = await screen.findByRole('button', {name: 'Test channel'});
  expect(channel.disabled).toBe(false);
  fireEvent.click(channel);
  expect(onClick).toHaveBeenCalledWith('one');
});
