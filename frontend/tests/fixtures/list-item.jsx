import { useState } from 'react';
import { createRoot } from 'react-dom/client';

import Divider from '../../src/components/composites/Divider';
import ListItem from '../../src/components/composites/ListItem';
import '../../src/index.css';

function ListItemHarness() {
  const [rowClicks, setRowClicks] = useState(0);
  const [trailingClicks, setTrailingClicks] = useState(0);

  return (
    <main>
      <div data-testid="list" style={{ width: 320 }}>
        <ListItem variant="1-line">
          <ListItem.Content>
            <ListItem.Headline>这是一个用于验证单行截断行为的很长标题</ListItem.Headline>
          </ListItem.Content>
        </ListItem>

        <ListItem variant="2-line" onClick={() => setRowClicks((count) => count + 1)}>
          <ListItem.Leading>前</ListItem.Leading>
          <ListItem.Content>
            <ListItem.Headline>可点击标题</ListItem.Headline>
            <ListItem.Supporting>支持文本</ListItem.Supporting>
          </ListItem.Content>
          <ListItem.Trailing>
            <button type="button" onClick={() => setTrailingClicks((count) => count + 1)}>
              尾部操作
            </button>
          </ListItem.Trailing>
        </ListItem>

        <ListItem variant="3-line" disabled onClick={() => setRowClicks((count) => count + 1)}>
          <ListItem.Content>
            <ListItem.Headline>禁用标题</ListItem.Headline>
            <ListItem.Supporting>禁用支持文本</ListItem.Supporting>
          </ListItem.Content>
        </ListItem>
      </div>

      <output aria-label="行点击次数">{rowClicks}</output>
      <output aria-label="尾部点击次数">{trailingClicks}</output>
      <Divider data-testid="divider" />
      <Divider data-testid="divider-inset" inset />
    </main>
  );
}

createRoot(document.getElementById('root')).render(<ListItemHarness />);
