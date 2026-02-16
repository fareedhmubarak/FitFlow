import React from "react";
import { Composition } from "remotion";
import { ProductDemo } from "./Video1";
import { FeatureShowcase } from "./Video2";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ProductDemo"
        component={ProductDemo}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="FeatureShowcase"
        component={FeatureShowcase}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
