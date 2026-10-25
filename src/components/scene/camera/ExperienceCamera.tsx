"use client";

import { useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera, Plane, Raycaster, Vector2, Vector3 } from "three";
import type { ExperienceCameraProps } from "@/experience/contracts";
import { CameraController, applyCameraPose } from "./camera";
import { bindCanvasInput } from "./input";

/** Sole camera writer; the coordinator must tick runtime.time before this frame callback. */
export function ExperienceCamera(props: ExperienceCameraProps) {
  const { camera, gl, size } = useThree();
  const [controller] = useState(() => new CameraController());
  const { phase, paused, reducedMotion } = props;

  useEffect(() => bindCanvasInput(gl.domElement, () => controller.input, () =>
    (phase === "exploring" || phase === "following") && !paused && !reducedMotion && !document.hidden,
  ), [gl, controller, phase, paused, reducedMotion]);

  useEffect(() => {
    const runtime = props.runtime.current;
    if (phase !== "following") { runtime.cursorTarget = null; return; }
    const plane = new Plane(new Vector3(0, 1, 0), 1.5); // y = -1.5
    const raycaster = new Raycaster();
    const ndc = new Vector2();
    const target = new Vector3();
    const onMove = (event: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      ndc.x = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
      ndc.y = -((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.ray.intersectPlane(plane, target);
      if (hit) runtime.cursorTarget = target.clone();
    };
    const onLeave = () => { runtime.cursorTarget = null; };
    gl.domElement.addEventListener("pointermove", onMove);
    gl.domElement.addEventListener("pointerleave", onLeave);
    return () => {
      gl.domElement.removeEventListener("pointermove", onMove);
      gl.domElement.removeEventListener("pointerleave", onLeave);
      runtime.cursorTarget = null;
    };
  }, [phase, gl, camera, props.runtime]);

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
