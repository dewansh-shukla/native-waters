import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; onRetry: () => void; retryLabel?: string };

export function SceneFailure({ onRetry, retryLabel = "Retry" }: Pick<Props, "onRetry" | "retryLabel">) {
  return (
    <div role="alert">
      <p>The 3D viewer could not load. The model or graphics renderer may be unavailable.</p>
      <button type="button" onClick={onRetry}>{retryLabel}</button>
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
