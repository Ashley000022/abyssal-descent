import React from 'react';
import {Composition} from 'remotion';
import {ManusAbyssalCommercial} from './ManusAbyssalCommercial';

export const Root: React.FC = () => (
  <Composition
    id="ManusAbyssalCommercial"
    component={ManusAbyssalCommercial}
    durationInFrames={720}
    fps={30}
    width={1920}
    height={1080}
  />
);
