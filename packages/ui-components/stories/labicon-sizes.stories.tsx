/**
 * Example story for styling an icon's size.
 */
// need this to avoid
// TS2686: 'React' refers to a UMD global, but the current file is a module.
import '@jupyterlab/application/style/index.css';
import '@jupyterlab/theme-light-extension/style/index.css';
import React from 'react';
import { clearIcon } from '../src';

export default {
  // component: LabIcon,
  title: 'LabIcon sizing'
};

export const clearSmall = (): JSX.Element => (
  <clearIcon.react elementSize="small" />
);
export const clearNormal = (): JSX.Element => (
  <clearIcon.react elementSize="normal" />
);
export const clearLarge = (): JSX.Element => (
  <clearIcon.react elementSize="large" />
);
export const clearXlarge = (): JSX.Element => (
  <clearIcon.react elementSize="xlarge" />
);
