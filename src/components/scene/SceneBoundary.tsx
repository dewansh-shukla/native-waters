import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; onRetry: () => void; retryLabel?: string };

export function SceneFailure({ onRetry, retryLabel = "Retry" }: Pick<Props, "onRetry" | "retryLabel">) {
  return (
    <div className="scene-failure" role="alert">
      <h2>The river is still here.</h2>
      <p>The 3D viewer could not load. Your browser may not support WebGL, or a model could not be downloaded.</p>
      <p>The sourced fish records are available without graphics.</p>
      <button type="button" onClick={onRetry}>{retryLabel}</button>{" "}
      <a href="/field-guide">Read the field guide</a>
    </div>
  );
}

export class SceneBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed
      ? <SceneFailure onRetry={this.props.onRetry} retryLabel={this.props.retryLabel} />
      : this.props.children;
  }
}
