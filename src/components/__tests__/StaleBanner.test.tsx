import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StaleBanner } from "../StaleBanner";

describe("StaleBanner", () => {
  it("renders when stale", () => {
    render(
      <StaleBanner stale generatedAt="2026-03-01T12:00:00.000Z" staleAfterHours={36} />
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("does not render when not stale", () => {
    const { container } = render(
      <StaleBanner stale={false} generatedAt="2999-01-01T00:00:00.000Z" staleAfterHours={36} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
