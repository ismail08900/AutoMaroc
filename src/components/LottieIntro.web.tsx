import React from 'react';
import AutomotiveSplash from './AutomotiveSplash';

interface LottieIntroProps {
  onFinish: () => void;
}

export default function LottieIntroWeb({ onFinish }: LottieIntroProps) {
  // Sur le Web, utiliser l'animation AutomotiveSplash optimisée et fluide
  return <AutomotiveSplash onFinish={onFinish} />;
}
