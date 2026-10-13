"use client";

import { useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "three";
import type { ExperienceCameraProps } from "@/experience/contracts";
import { CameraController, applyCameraPose } from "./camera";
import { bindCanvasInput } from "./input";

/** Sole camera writer; the coordinator must tick runtime.time before this frame callback. */
export function ExperienceCamera(props: ExperienceCameraProps) {
  const { camera, gl, size } = useThree();
  const [controller] = useState(() => new CameraController());
  const { phase, paused, reducedMotion } = props;

  useEffect(() => bindCanvasInput(gl.domElement, () => controller.input, () =>
    phase === "exploring" && !paused && !reducedMotion && !document.hidden,
  ), [gl, controller, phase, paused, reducedMotion]);

  useFrame(() => {
    const entered = controller.update({
      ...props,
      runtime: props.runtime.current,
      hidden: document.hidden,
      aspect: size.width / Math.max(size.height, 1),
      fov: camera instanceof PerspectiveCamera ? camera.fov : 45,
    });
    applyCameraPose(camera, controller, size.width / Math.max(size.height, 1));
    if (entered) props.onEntered();
  });
  return null;
}
