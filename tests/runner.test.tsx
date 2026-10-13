import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

test("renders accessible DOM with the automatic JSX transform", () => {
  render(<h1>Native Waters</h1>);
  expect(
    screen.getByRole("heading", { name: "Native Waters", level: 1 }),
  ).toBeInTheDocument();
});
