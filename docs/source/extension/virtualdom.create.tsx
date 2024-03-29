import * as React from 'react';

import { Widget } from '@lumino/widgets';
import { ReactWidget } from '@jupyterlab/ui-components';

function MyComponent() {
  return <div>My Widget</div>;
}

const myWidget: Widget = ReactWidget.create(<MyComponent />);
Widget.attach(myWidget, document.body);
